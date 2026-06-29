import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Fetches a published Outlook (.ics) calendar and returns upcoming events.
 * Read-only, server-side (avoids CORS). Minimal VEVENT parser — handles
 * one-off events with DTSTART/DTEND, SUMMARY, UID, LOCATION, and ATTENDEE
 * emails. Recurring-event expansion is intentionally out of scope (sales
 * demos are one-off); recurring masters are skipped.
 */

interface ParsedEvent {
  uid: string;
  title: string;
  start: string; // ISO
  end: string | null;
  location: string | null;
  attendees: string[]; // emails
  organizer: string | null;
}

function unfold(ics: string): string[] {
  // ICS line-folding: lines starting with a space/tab continue the previous line.
  const raw = ics.replace(/\r\n/g, "\n").split("\n");
  const lines: string[] = [];
  for (const line of raw) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && lines.length) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
  }
  return lines;
}

function parseIcsDate(val: string, params: Record<string, string>): string | null {
  // Forms: 20260625T143000Z (UTC), 20260625T143000 (local/TZID), 20260625 (all-day)
  const v = val.trim();
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, hh = "00", mm = "00", ss = "00", z] = m;
  if (z) {
    return new Date(`${y}-${mo}-${d}T${hh}:${mm}:${ss}Z`).toISOString();
  }
  // TZID or floating — best-effort: treat as the calendar's wall time. Outlook
  // published feeds are usually UTC (Z); for TZID we approximate by constructing
  // a Date in the server's interpretation, then trusting the wall components.
  // We return an ISO that preserves the wall time; the client converts to CST.
  return `${y}-${mo}-${d}T${hh}:${mm}:${ss}`;
}

function parseEvents(ics: string): ParsedEvent[] {
  const lines = unfold(ics);
  const events: ParsedEvent[] = [];
  let cur: Partial<ParsedEvent> & { attendees: string[]; isRecurring?: boolean } | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      cur = { attendees: [] };
      continue;
    }
    if (line === "END:VEVENT") {
      if (cur && cur.uid && cur.title && cur.start && !cur.isRecurring) {
        events.push({
          uid: cur.uid,
          title: cur.title,
          start: cur.start,
          end: cur.end ?? null,
          location: cur.location ?? null,
          attendees: cur.attendees,
          organizer: cur.organizer ?? null,
        });
      }
      cur = null;
      continue;
    }
    if (!cur) continue;

    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const left = line.slice(0, idx);
    const value = line.slice(idx + 1);
    const [name, ...paramParts] = left.split(";");
    const params: Record<string, string> = {};
    for (const p of paramParts) {
      const eq = p.indexOf("=");
      if (eq > -1) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1);
    }

    switch (name.toUpperCase()) {
      case "UID": cur.uid = value.trim(); break;
      case "SUMMARY": cur.title = value.replace(/\\,/g, ",").replace(/\\n/g, " ").trim(); break;
      case "DTSTART": cur.start = parseIcsDate(value, params) ?? cur.start; break;
      case "DTEND": cur.end = parseIcsDate(value, params) ?? cur.end; break;
      case "LOCATION": cur.location = value.replace(/\\,/g, ",").trim() || null; break;
      case "RRULE": cur.isRecurring = true; break; // skip recurring masters (v1)
      case "ORGANIZER": {
        const mail = value.match(/mailto:([^\s;]+)/i);
        if (mail) cur.organizer = mail[1].toLowerCase();
        break;
      }
      case "ATTENDEE": {
        const mail = value.match(/mailto:([^\s;]+)/i);
        if (mail) cur.attendees.push(mail[1].toLowerCase());
        break;
      }
    }
  }
  return events;
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Missing calendar url" }, { status: 400 });
    }
    // Outlook share links sometimes use webcal:// — normalize to https.
    const fetchUrl = url.replace(/^webcal:\/\//i, "https://");
    const res = await fetch(fetchUrl, { headers: { Accept: "text/calendar" }, cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ error: `Calendar fetch failed (${res.status})` }, { status: 502 });
    }
    const text = await res.text();
    if (!text.includes("BEGIN:VCALENDAR")) {
      return NextResponse.json({ error: "That URL didn't return a calendar feed" }, { status: 422 });
    }

    // Keep events from ~60 days back through +21 days. The reminders only act on
    // today/future, but the meetings-calendar sync also wants recent PAST meetings
    // so the 1st/2nd/3rd-meeting sequence has history to count.
    const now = Date.now();
    const lo = now - 60 * 86400000;
    const hi = now + 21 * 86400000;
    const events = parseEvents(text)
      .filter((e) => {
        const t = new Date(e.start).getTime();
        return !Number.isNaN(t) && t >= lo && t <= hi;
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    return NextResponse.json({ events });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to read calendar" }, { status: 500 });
  }
}
