import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export interface SessionCallStats {
  total: number;
  connected: number;
  voicemail: number;
  noAnswer: number;
  skipped: number;
  aiScreener: number;
  wrongNumber: number;
  meetingsBooked: number;
}

export async function fetchSessionCallStats(
  supabase: SupabaseClient<Database>,
  userId: string,
  sessionId: string | null,
  sessionStartTime: Date
): Promise<SessionCallStats> {
  const calls: { outcome: string | null; disposition: string | null }[] = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    let query = supabase
      .from("calls")
      .select("outcome, disposition")
      .eq("user_id", userId);

    // Explicit sessions stay isolated even when sessions overlap or are resumed.
    // Keep the existing time-based fallback if creating the DB session failed.
    query = sessionId
      ? query.eq("session_id", sessionId)
      : query.gte("started_at", sessionStartTime.toISOString());

    const { data, error } = await query
      .order("started_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    calls.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }

  return {
    total: calls.length,
    connected: calls.filter((c) => c.outcome === "connected").length,
    voicemail: calls.filter((c) => c.outcome === "voicemail").length,
    noAnswer: calls.filter((c) => c.outcome === "no_answer").length,
    skipped: calls.filter((c) => c.outcome === "skipped").length,
    aiScreener: calls.filter((c) => c.outcome === "ai_screener").length,
    wrongNumber: calls.filter((c) => c.outcome === "wrong_number").length,
    // Calendar imports and standalone appointments are not dialer conversions.
    meetingsBooked: calls.filter(
      (c) => c.outcome === "connected" &&
        (c.disposition === "meeting" || c.disposition === "interested_meeting")
    ).length,
  };
}
