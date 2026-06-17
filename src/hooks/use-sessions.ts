"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuthId } from "@/hooks/use-auth";
import type { 
  DialerSession, 
  DialerSessionInsert, 
  DialerSessionUpdate,
  SessionWithStats 
} from "@/types/analytics";

const SESSION_GAP_MINUTES = 30; // Gap of 30+ minutes = new session

// Get all sessions for a date range
export function useSessions(options?: {
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  const supabase = createClient();
  const userId = useAuthId();

  return useQuery({
    queryKey: ["dialer-sessions", userId, options],
    queryFn: async () => {
      let query = (supabase as any)
        .from("dialer_sessions")
        .select("*")
        .eq("user_id", userId!)
        .order("started_at", { ascending: false });

      if (options?.startDate) {
        query = query.gte("started_at", options.startDate);
      }
      if (options?.endDate) {
        query = query.lte("started_at", options.endDate);
      }
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        if (error.code === "42P01") return []; // Table doesn't exist
        throw error;
      }

      // Compute additional stats
      return (data as DialerSession[]).map((session): SessionWithStats => ({
        ...session,
        answer_rate: (session.total_calls - session.skipped) > 0
          ? Math.round((session.connected_calls / (session.total_calls - session.skipped)) * 100)
          : 0,
        set_rate: session.connected_calls > 0 
          ? Math.round((session.meetings_booked / session.connected_calls) * 100) 
          : 0,
        calls_per_hour: session.duration_seconds && session.duration_seconds > 0
          ? Math.round((session.total_calls / (session.duration_seconds / 3600)) * 10) / 10
          : 0,
      }));
    },
    enabled: !!userId,
  });
}

// Get today's sessions
export function useTodaySessions() {
  const today = new Date().toISOString().split("T")[0];
  return useSessions({
    startDate: `${today}T00:00:00`,
    endDate: `${today}T23:59:59`,
  });
}

// Get the current active session (or most recent)
export function useCurrentSession() {
  const supabase = createClient();
  const userId = useAuthId();

  return useQuery({
    queryKey: ["current-session", userId],
    queryFn: async () => {
      // Get the most recent session that hasn't ended (or ended recently)
      const { data, error } = await (supabase as any)
        .from("dialer_sessions")
        .select("*")
        .eq("user_id", userId!)
        .order("started_at", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === "PGRST116" || error.code === "42P01") return null;
        throw error;
      }

      return data as DialerSession;
    },
    enabled: !!userId,
  });
}

// Create a new session (auto-ends any previous open session for this user)
export function useCreateSession() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const userId = useAuthId();

  return useMutation({
    mutationFn: async (session: Omit<DialerSessionInsert, "user_id">) => {
      const now = new Date();

      // End all previous open sessions so they no longer show "In progress"
      const { data: openSessions } = await (supabase as any)
        .from("dialer_sessions")
        .select("id, started_at, total_pause_duration_seconds")
        .eq("user_id", userId!)
        .is("ended_at", null);

      if (openSessions?.length) {
        let firstUpdateError: string | null = null;
        let firstUpdateId: string | null = null;
        for (const open of openSessions) {
          const { error: updateError } = await (supabase as any)
            .from("dialer_sessions")
            .update({ ended_at: now.toISOString() })
            .eq("id", open.id);
          if (updateError && !firstUpdateError) {
            firstUpdateError = updateError.message || String(updateError);
            firstUpdateId = open.id;
          }
        }
      }

      const { data, error } = await (supabase as any)
        .from("dialer_sessions")
        .insert({
          ...session,
          user_id: userId!,
        })
        .select()
        .single();

      if (error) throw error;
      return data as DialerSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dialer-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["current-session"] });
    },
  });
}

// Update a session
export function useUpdateSession() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: DialerSessionUpdate;
    }) => {
      const { data, error } = await (supabase as any)
        .from("dialer_sessions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as DialerSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dialer-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["current-session"] });
    },
  });
}

// End a session - calculates duration accounting for pause time
export function useEndSession() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const now = new Date();
      // duration_seconds is a GENERATED column (computed from ended_at - started_at); only set ended_at
      const { data, error } = await (supabase as any)
        .from("dialer_sessions")
        .update({ ended_at: now.toISOString() })
        .eq("id", sessionId)
        .select()
        .single();

      if (error) throw error;
      return data as DialerSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dialer-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["current-session"] });
    },
  });
}

// End all open sessions for the current user (set ended_at so they no longer show "In progress")
export function useEndAllOpenSessions() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const userId = useAuthId();

  return useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      const { data: openSessions, error: fetchError } = await (supabase as any)
        .from("dialer_sessions")
        .select("id")
        .eq("user_id", userId!)
        .is("ended_at", null);

      if (fetchError) throw fetchError;
      if (!openSessions?.length) return { count: 0 };

      for (const row of openSessions) {
        const { error: updateError } = await (supabase as any)
          .from("dialer_sessions")
          .update({ ended_at: now })
          .eq("id", row.id);
        if (updateError) throw updateError;
      }
      return { count: openSessions.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dialer-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["current-session"] });
      queryClient.invalidateQueries({ queryKey: ["analytics-summary"] });
    },
  });
}

// Pause a session - records pause timestamp
export function usePauseSession() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const now = new Date().toISOString();

      // Fetch current paused_at array
      const { data: session, error: fetchError } = await (supabase as any)
        .from("dialer_sessions")
        .select("paused_at")
        .eq("id", sessionId)
        .single();

      if (fetchError) throw fetchError;

      const pausedAtArray = session?.paused_at || [];

      const { data, error } = await (supabase as any)
        .from("dialer_sessions")
        .update({
          paused_at: [...pausedAtArray, now],
        })
        .eq("id", sessionId)
        .select()
        .single();

      if (error) throw error;
      return data as DialerSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dialer-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["current-session"] });
    },
  });
}

// Resume a session - records resume timestamp and calculates pause duration
export function useResumeSession() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const now = new Date();

      // Fetch current session state
      const { data: session, error: fetchError } = await (supabase as any)
        .from("dialer_sessions")
        .select("paused_at, resumed_at, total_pause_duration_seconds")
        .eq("id", sessionId)
        .single();

      if (fetchError) throw fetchError;

      const pausedAtArray: string[] = session?.paused_at || [];
      const resumedAtArray: string[] = session?.resumed_at || [];
      let totalPauseDuration = session?.total_pause_duration_seconds || 0;

      // Calculate duration of this pause (last pause timestamp to now)
      if (pausedAtArray.length > resumedAtArray.length) {
        const lastPausedAt = new Date(pausedAtArray[pausedAtArray.length - 1]);
        const pauseDuration = Math.floor((now.getTime() - lastPausedAt.getTime()) / 1000);
        totalPauseDuration += pauseDuration;
      }

      const { data, error } = await (supabase as any)
        .from("dialer_sessions")
        .update({
          resumed_at: [...resumedAtArray, now.toISOString()],
          total_pause_duration_seconds: totalPauseDuration,
        })
        .eq("id", sessionId)
        .select()
        .single();

      if (error) throw error;
      return data as DialerSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dialer-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["current-session"] });
    },
  });
}

// Auto-detect or create session when logging a call
export function useSessionTracker() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const userId = useAuthId();
  const createSession = useCreateSession();
  const updateSession = useUpdateSession();

  return useMutation({
    mutationFn: async (callData: {
      outcome: string;
      duration_seconds: number;
    }) => {
      const now = new Date();
      const gapThreshold = new Date(now.getTime() - SESSION_GAP_MINUTES * 60 * 1000);

      // Find the most recent session
      const { data: recentSession } = await (supabase as any)
        .from("dialer_sessions")
        .select("*")
        .eq("user_id", userId!)
        .gte("started_at", gapThreshold.toISOString())
        .order("started_at", { ascending: false })
        .limit(1)
        .single();

      let session: DialerSession;

      if (recentSession && (!recentSession.ended_at || new Date(recentSession.ended_at) > gapThreshold)) {
        // Update existing session
        const updates: DialerSessionUpdate = {
          total_calls: (recentSession.total_calls || 0) + 1,
          ended_at: now.toISOString(),
        };

        // Increment the appropriate outcome counter
        switch (callData.outcome) {
          case "connected":
            updates.connected_calls = (recentSession.connected_calls || 0) + 1;
            updates.total_talk_time_seconds = (recentSession.total_talk_time_seconds || 0) + callData.duration_seconds;
            break;
          case "voicemail":
            updates.voicemails = (recentSession.voicemails || 0) + 1;
            break;
          case "no_answer":
            updates.no_answers = (recentSession.no_answers || 0) + 1;
            break;
          case "skipped":
            updates.skipped = (recentSession.skipped || 0) + 1;
            break;
          case "gatekeeper":
            updates.gatekeepers = (recentSession.gatekeepers || 0) + 1;
            break;
          case "wrong_number":
            updates.wrong_numbers = (recentSession.wrong_numbers || 0) + 1;
            break;
          case "ai_screener":
            updates.ai_screener = (recentSession.ai_screener || 0) + 1;
            break;
        }

        session = await updateSession.mutateAsync({
          id: recentSession.id,
          updates,
        });
      } else {
        // Create new session
        const initialCounts: DialerSessionInsert = {
          user_id: userId!,
          started_at: now.toISOString(),
          total_calls: 1,
          connected_calls: callData.outcome === "connected" ? 1 : 0,
          voicemails: callData.outcome === "voicemail" ? 1 : 0,
          no_answers: callData.outcome === "no_answer" ? 1 : 0,
          skipped: callData.outcome === "skipped" ? 1 : 0,
          gatekeepers: callData.outcome === "gatekeeper" ? 1 : 0,
          wrong_numbers: callData.outcome === "wrong_number" ? 1 : 0,
          ai_screener: callData.outcome === "ai_screener" ? 1 : 0,
          total_talk_time_seconds: callData.outcome === "connected" ? callData.duration_seconds : 0,
        };

        session = await createSession.mutateAsync(initialCounts);
      }

      return session;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dialer-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["current-session"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

// Increment meetings booked for current session
export function useIncrementSessionMeetings() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const userId = useAuthId();

  return useMutation({
    mutationFn: async () => {
      const now = new Date();
      const gapThreshold = new Date(now.getTime() - SESSION_GAP_MINUTES * 60 * 1000);

      // Find the current session
      const { data: currentSession } = await (supabase as any)
        .from("dialer_sessions")
        .select("*")
        .eq("user_id", userId!)
        .gte("started_at", gapThreshold.toISOString())
        .order("started_at", { ascending: false })
        .limit(1)
        .single();

      if (!currentSession) return null;

      const { data, error } = await (supabase as any)
        .from("dialer_sessions")
        .update({
          meetings_booked: (currentSession.meetings_booked || 0) + 1,
        })
        .eq("id", currentSession.id)
        .select()
        .single();

      if (error) throw error;
      return data as DialerSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dialer-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["current-session"] });
    },
  });
}

export interface SessionCall {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  outcome: string;
  disposition: string | null;
  notes: string | null;
  contact: { id: string; first_name: string; last_name: string | null; company_name: string | null } | null;
}

export interface SessionDetail {
  session: DialerSession;
  calls: SessionCall[];
  metrics: {
    totalCalls: number;
    connected: number;
    voicemails: number;
    noAnswers: number;
    skipped: number;
    meetingsBooked: number;
    answerRate: number;
    setRate: number;
    durationSeconds: number | null;
    talkTimeSeconds: number;
  };
}

const MEETING_DISPOSITIONS = ["meeting", "interested_meeting"];

/**
 * Per-session drill-down: the session row + all calls logged under it
 * (calls.session_id = id) + computed metrics. Only sessions created after the
 * ai_screener fix have linked calls; older calls have no session_id.
 */
export function useSessionDetail(sessionId: string) {
  const supabase = createClient();
  const userId = useAuthId();

  return useQuery<SessionDetail | null>({
    queryKey: ["session-detail", userId, sessionId],
    enabled: !!userId && !!sessionId,
    queryFn: async () => {
      const { data: session, error: sErr } = await (supabase as any)
        .from("dialer_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();
      if (sErr) throw sErr;

      const { data: callsData, error: cErr } = await supabase
        .from("calls")
        .select(
          "id, started_at, ended_at, duration_seconds, outcome, disposition, notes, contacts(id, first_name, last_name, company_name)"
        )
        .eq("session_id", sessionId)
        .order("started_at", { ascending: true });
      if (cErr) throw cErr;

      const calls: SessionCall[] = ((callsData as any[]) || []).map((c) => ({
        id: c.id,
        started_at: c.started_at,
        ended_at: c.ended_at,
        duration_seconds: c.duration_seconds,
        outcome: c.outcome,
        disposition: c.disposition,
        notes: c.notes,
        contact: c.contacts
          ? {
              id: c.contacts.id,
              first_name: c.contacts.first_name,
              last_name: c.contacts.last_name,
              company_name: c.contacts.company_name,
            }
          : null,
      }));

      const totalCalls = calls.length;
      const connected = calls.filter((c) => c.outcome === "connected").length;
      const voicemails = calls.filter((c) => c.outcome === "voicemail").length;
      const noAnswers = calls.filter((c) => c.outcome === "no_answer").length;
      const skipped = calls.filter((c) => c.outcome === "skipped").length;
      const meetingsBooked = calls.filter(
        (c) => c.outcome === "connected" && c.disposition && MEETING_DISPOSITIONS.includes(c.disposition)
      ).length;
      const attempts = totalCalls - skipped;
      const talkTimeSeconds = calls
        .filter((c) => c.outcome === "connected")
        .reduce((s, c) => s + (c.duration_seconds || 0), 0);

      return {
        session: session as DialerSession,
        calls,
        metrics: {
          totalCalls,
          connected,
          voicemails,
          noAnswers,
          skipped,
          meetingsBooked,
          answerRate: attempts > 0 ? Math.round((connected / attempts) * 100) : 0,
          setRate: connected > 0 ? Math.round((meetingsBooked / connected) * 100) : 0,
          durationSeconds: (session as any).duration_seconds,
          talkTimeSeconds,
        },
      };
    },
  });
}
