"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_USER_ID } from "@/lib/default-user";
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

  return useQuery({
    queryKey: ["dialer-sessions", DEFAULT_USER_ID, options],
    queryFn: async () => {
      let query = (supabase as any)
        .from("dialer_sessions")
        .select("*")
        .eq("user_id", DEFAULT_USER_ID)
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
        answer_rate: session.total_calls > 0 
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

  return useQuery({
    queryKey: ["current-session", DEFAULT_USER_ID],
    queryFn: async () => {
      // Get the most recent session that hasn't ended (or ended recently)
      const { data, error } = await (supabase as any)
        .from("dialer_sessions")
        .select("*")
        .eq("user_id", DEFAULT_USER_ID)
        .order("started_at", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === "PGRST116" || error.code === "42P01") return null;
        throw error;
      }

      return data as DialerSession;
    },
  });
}

// Create a new session
export function useCreateSession() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (session: Omit<DialerSessionInsert, "user_id">) => {
      const { data, error } = await (supabase as any)
        .from("dialer_sessions")
        .insert({
          ...session,
          user_id: DEFAULT_USER_ID,
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
      // Fetch the session to get started_at and total_pause_duration_seconds
      const { data: session, error: fetchError } = await (supabase as any)
        .from("dialer_sessions")
        .select("started_at, total_pause_duration_seconds")
        .eq("id", sessionId)
        .single();

      if (fetchError) throw fetchError;

      const now = new Date();
      const startedAt = new Date(session.started_at);
      const totalSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
      const pauseSeconds = session.total_pause_duration_seconds || 0;
      const effectiveDuration = Math.max(0, totalSeconds - pauseSeconds);

      const { data, error } = await (supabase as any)
        .from("dialer_sessions")
        .update({
          ended_at: now.toISOString(),
          duration_seconds: effectiveDuration,
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
        .eq("user_id", DEFAULT_USER_ID)
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
          user_id: DEFAULT_USER_ID,
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

  return useMutation({
    mutationFn: async () => {
      const now = new Date();
      const gapThreshold = new Date(now.getTime() - SESSION_GAP_MINUTES * 60 * 1000);

      // Find the current session
      const { data: currentSession } = await (supabase as any)
        .from("dialer_sessions")
        .select("*")
        .eq("user_id", DEFAULT_USER_ID)
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
