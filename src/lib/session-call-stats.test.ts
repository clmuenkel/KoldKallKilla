import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { fetchSessionCallStats } from "./session-call-stats";

const started = new Date("2026-11-11T19:11:35.195Z");
const call = (overrides = {}) => ({
  id: "call-1", user_id: "user-1", session_id: "session-1",
  started_at: "2026-11-11T20:00:00Z", outcome: "connected", disposition: "meeting",
  ...overrides,
});

function database(calls: ReturnType<typeof call>[], meetings: Record<string, unknown>[] = []) {
  const requests: URL[] = [];
  const client = createClient<Database>("https://example.supabase.co", "test-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: async (input) => {
        const url = new URL(String(input));
        requests.push(url);
        let rows: Record<string, unknown>[] = url.pathname.endsWith("/meetings") ? meetings : calls;
        for (const column of ["user_id", "session_id", "started_at"]) {
          const filter = url.searchParams.get(column);
          if (filter?.startsWith("eq.")) rows = rows.filter((r) => r[column] === filter.slice(3));
          if (filter?.startsWith("gte.")) rows = rows.filter((r) => String(r[column]) >= filter.slice(4));
        }
        const offset = Number(url.searchParams.get("offset") || 0);
        const limit = Number(url.searchParams.get("limit") || 1000);
        return new Response(JSON.stringify(rows.slice(offset, offset + limit)), {
          status: 200, headers: { "Content-Type": "application/json" },
        });
      },
    },
  });
  return { client, requests };
}

test("3 dialer bookings stay 3 with 12 calendar imports and an extra manual appointment", async () => {
  const { client, requests } = database([
    call(), call({ id: "call-2" }), call({ id: "call-3", disposition: "interested_meeting" }),
    ...Array.from({ length: 4 }, (_, i) => call({ id: `pickup-${i}`, disposition: "callback" })),
    ...Array.from({ length: 102 }, (_, i) => call({ id: `miss-${i}`, outcome: "no_answer", disposition: null })),
    call({ id: "other-session", session_id: "session-2" }),
    call({ id: "other-user", user_id: "user-2" }),
  ], [
    ...Array.from({ length: 12 }, () => ({ source: "google_calendar", created_at: "2026-11-11T20:34:38Z" })),
    ...Array.from({ length: 4 }, () => ({ source: "manual", created_at: "2026-11-11T21:00:00Z" })),
  ]);
  const stats = await fetchSessionCallStats(client, "user-1", "session-1", started);
  assert.equal(stats.total, 109);
  assert.equal(stats.connected, 7);
  assert.equal(stats.meetingsBooked, 3);
  assert.ok(requests.every((url) => url.pathname.endsWith("/calls")));
  assert.equal(requests[0].searchParams.get("session_id"), "eq.session-1");
  assert.equal(requests[0].searchParams.get("user_id"), "eq.user-1");
});

test("stale meeting dispositions on unanswered calls do not count", async () => {
  const { client } = database([
    call({ outcome: "no_answer" }), call({ outcome: "voicemail" }),
    call({ outcome: "skipped", disposition: "interested_meeting" }),
    call({ disposition: "interested_follow_up" }),
  ]);
  assert.equal((await fetchSessionCallStats(client, "user-1", "session-1", started)).meetingsBooked, 0);
});

test("a fresh session starts at zero even after another session booked meetings", async () => {
  const { client } = database([call()]);
  assert.equal((await fetchSessionCallStats(client, "user-1", "session-2", started)).meetingsBooked, 0);
});

test("sessions beyond the API row limit include bookings on later pages", async () => {
  const { client, requests } = database([
    ...Array.from({ length: 1000 }, (_, i) => call({ id: `miss-${i}`, outcome: "no_answer" })),
    call({ id: "last-call" }),
  ]);
  const stats = await fetchSessionCallStats(client, "user-1", "session-1", started);
  assert.equal(stats.total, 1001);
  assert.equal(stats.meetingsBooked, 1);
  assert.equal(requests.length, 2);
});

test("if DB session creation failed, the time fallback still counts only dial outcomes", async () => {
  const { client } = database([
    call({ session_id: null }),
    call({ started_at: "2026-11-10T20:00:00Z" }),
    call({ user_id: "user-2" }),
  ]);
  assert.equal((await fetchSessionCallStats(client, "user-1", null, started)).meetingsBooked, 1);
});

test("a database error is surfaced instead of showing a false zero", async () => {
  const client = createClient<Database>("https://example.supabase.co", "test-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async () => new Response(JSON.stringify({ message: "Unavailable", code: "XX000" }), { status: 500 }) },
  });
  await assert.rejects(fetchSessionCallStats(client, "user-1", "session-1", started));
});
