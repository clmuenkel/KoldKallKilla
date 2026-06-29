"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuthId } from "@/hooks/use-auth";
import { useOutlookEvents, type OutlookEvent } from "@/hooks/use-outlook";

/**
 * Is this calendar event a prospect/sales meeting worth importing?
 * Per Zad's choice: keep only prospect meetings, not personal/internal events.
 * Zad's sales meetings are reliably titled "<Company> x Evios" and/or have a CRM
 * contact attending, so we key on exactly those two signals — precise, and it
 * keeps internal/personal events (and recurring internal collaborators) out.
 *  - it already matched a CRM contact, OR
 *  - the title mentions "Evios".
 */
export function isProspectMeeting(e: OutlookEvent): boolean {
  if (e.contactId) return true;
  if (/evios/i.test(e.title || "")) return true;
  return false;
}

function durationMinutes(start: string, end: string | null): number {
  if (!end) return 30;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const mins = Math.round(ms / 60000);
  return mins > 0 && mins < 24 * 60 ? mins : 30;
}

/**
 * Imports prospect meetings from the connected Google Calendar into the CRM
 * `meetings` table (idempotent — deduped by external_uid). New events are
 * inserted; events already imported get only their calendar-owned fields
 * refreshed (title/time/duration/location), never user-owned ones
 * (status/outcome/contact_id/sequence_override). Runs once per mount after the
 * calendar feed loads. Mount this on the meetings page.
 */
export function useCalendarSync() {
  const supabase = createClient();
  const userId = useAuthId();
  const queryClient = useQueryClient();
  const { data: events } = useOutlookEvents();
  const ranForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userId || !events) return;
    const prospects = events.filter(isProspectMeeting);
    // Re-run only when the set of event uids changes (avoids loops on re-render).
    const sig = prospects.map((e) => e.uid).sort().join("|");
    if (ranForRef.current === sig) return;
    ranForRef.current = sig;
    if (prospects.length === 0) return;

    (async () => {
      const starts = prospects.map((e) => new Date(e.start).getTime());
      const lo = new Date(Math.min(...starts) - 86400000).toISOString();
      const hi = new Date(Math.max(...starts) + 86400000).toISOString();

      // Pull meetings around the event window: both already-synced rows (matched
      // by external_uid) AND existing manual meetings we might need to dedup
      // against (Zad books some of these same meetings in the CRM directly).
      const { data: existing } = await supabase
        .from("meetings")
        .select("id, external_uid, source, scheduled_at, contact_id, title, duration_minutes, location")
        .eq("user_id", userId)
        .gte("scheduled_at", lo)
        .lte("scheduled_at", hi);
      const rows = (existing as any[]) ?? [];
      const byUid = new Map(rows.filter((m) => m.external_uid).map((m) => [m.external_uid, m]));
      const candidates = rows.filter((m) => !m.external_uid); // manual meetings, adoptable
      const adopted = new Set<string>();
      const MATCH_MS = 15 * 60 * 1000;

      const toInsert: any[] = [];
      const updates: Array<{ id: string; patch: any }> = [];

      for (const e of prospects) {
        const cal = {
          title: e.title || "Meeting",
          scheduled_at: e.start,
          duration_minutes: durationMinutes(e.start, e.end),
          location: e.location ?? null,
        };
        const found = byUid.get(e.uid);
        if (found) {
          // Refresh calendar-owned fields only for purely-imported rows (never
          // clobber a meeting Zad created/edited himself — adopted ones keep
          // their title/contact/status).
          if (found.source === "google_calendar") {
            const changed =
              found.title !== cal.title ||
              new Date(found.scheduled_at).getTime() !== new Date(cal.scheduled_at).getTime() ||
              found.duration_minutes !== cal.duration_minutes ||
              (found.location ?? null) !== cal.location;
            if (changed) updates.push({ id: found.id, patch: cal });
          }
          continue;
        }

        // Dedup against an existing manual meeting at ~the same time (same real
        // meeting Zad booked in the CRM). Adopt it (tag the external_uid) instead
        // of creating a duplicate; keep its own title/contact/status.
        const t = new Date(e.start).getTime();
        const match = candidates
          .filter((c) => !adopted.has(c.id) && Math.abs(new Date(c.scheduled_at).getTime() - t) <= MATCH_MS)
          .sort((a, b) => {
            // prefer same contact, then closest in time
            const ac = e.contactId && a.contact_id === e.contactId ? 0 : 1;
            const bc = e.contactId && b.contact_id === e.contactId ? 0 : 1;
            if (ac !== bc) return ac - bc;
            return Math.abs(new Date(a.scheduled_at).getTime() - t) - Math.abs(new Date(b.scheduled_at).getTime() - t);
          })[0];

        if (match) {
          adopted.add(match.id);
          updates.push({
            id: match.id,
            patch: { external_uid: e.uid, external_attendees: e.attendees ?? [] },
          });
        } else {
          toInsert.push({
            user_id: userId,
            contact_id: e.contactId ?? null,
            company_id: e.contactCompanyId ?? null,
            source: "google_calendar",
            external_uid: e.uid,
            external_attendees: e.attendees ?? [],
            status: "scheduled",
            ...cal,
          });
        }
      }

      let changed = false;
      if (toInsert.length) {
        const { error } = await supabase.from("meetings").insert(toInsert);
        if (error) {
          // 23505 = unique violation (raced with another import); safe to ignore.
          if ((error as any).code !== "23505") {
            console.error("Calendar sync insert failed:", error.message);
            ranForRef.current = null; // allow retry
          }
        } else {
          changed = true;
        }
      }
      for (const u of updates) {
        const { error } = await supabase.from("meetings").update(u.patch).eq("id", u.id);
        if (!error) changed = true;
      }
      if (changed) {
        queryClient.invalidateQueries({ queryKey: ["meetings"] });
      }
    })();
  }, [userId, events, supabase, queryClient]);
}
