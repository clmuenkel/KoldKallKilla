"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuthId } from "@/hooks/use-auth";
import { addBusinessDays, formatDateForDB, INDEFINITE_PAUSE_DATE } from "@/lib/utils";
import type { Call, CallWithContact, InsertTables } from "@/types/database";

const SESSION_GAP_MINUTES = 30;
const MAX_CALL_ATTEMPTS = 10;
const DEFAULT_CADENCE_DAYS = 2; // 2-3 business days between calls
const INTERESTED_CADENCE_DAYS = 7; // Weekly for interested contacts
const NOT_INTERESTED_PAUSE_DAYS = 30; // 30-day pause for not interested

export function useCalls(filters?: {
  contactId?: string;
  companyId?: string;
  limit?: number;
  today?: boolean;
}) {
  const supabase = createClient();

  return useQuery<CallWithContact[]>({
    queryKey: ["calls", filters],
    queryFn: async () => {
      let query = supabase
        .from("calls")
        .select("*, contacts(id, first_name, last_name, company_name)")
        .order("started_at", { ascending: false });

      if (filters?.contactId) {
        query = query.eq("contact_id", filters.contactId);
      }

      if (filters?.today) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        query = query.gte("started_at", today.toISOString());
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as CallWithContact[];
    },
  });
}

interface CallStats {
  total: number;
  connected: number;
  voicemail: number;
  noAnswer: number;
  meetingsBooked: number;
}

export function useTodayCallStats() {
  const supabase = createClient();

  return useQuery<CallStats>({
    queryKey: ["calls", "today-stats"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: callData, error } = await supabase
        .from("calls")
        .select("outcome, disposition")
        .gte("started_at", today.toISOString());

      if (error) throw error;

      const data = callData as { outcome: string | null; disposition: string | null }[];
      const stats: CallStats = {
        total: data.length,
        connected: data.filter((c) => c.outcome === "connected").length,
        voicemail: data.filter((c) => c.outcome === "voicemail").length,
        noAnswer: data.filter((c) => c.outcome === "no_answer").length,
        meetingsBooked: data.filter((c) => c.disposition === "interested_meeting").length,
      };

      return stats;
    },
  });
}

export function useCreateCall() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (call: InsertTables<"calls">) => {
      const { data, error } = await supabase
        .from("calls")
        .insert(call as any)
        .select()
        .single();
      if (error) throw error;

      // Update contact's last_contacted_at 
      await (supabase as any)
        .from("contacts")
        .update({
          last_contacted_at: new Date().toISOString(),
        })
        .eq("id", call.contact_id);

      return data as Call;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calls"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contacts-paginated"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

export function useLogCall() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      call,
      createTask,
    }: {
      call: InsertTables<"calls">;
      createTask?: {
        title: string;
        due_date: string;
        contact_id: string;
        user_id: string;
      };
    }) => {
      // Insert the call first - this is the single source of truth for "call logged"
      const { data: callData, error: callError } = await supabase
        .from("calls")
        .insert(call as any)
        .select()
        .single();

      if (callError) {
        console.error("[logCall] Call insert failed:", callError.message, { contact_id: call.contact_id, outcome: call.outcome });
        throw callError;
      }

      const savedCall = callData as { id: string };

      // Save timestamped notes to the unified notes table
      // This creates permanent note records linked to the call
      if (call.timestamped_notes && Array.isArray(call.timestamped_notes) && call.timestamped_notes.length > 0) {
        const notesToInsert = call.timestamped_notes.map((note: { time: string; note: string }) => ({
          user_id: call.user_id,
          contact_id: call.contact_id,
          call_id: savedCall.id,
          content: note.note,
          source: "call" as const,
          call_timestamp: note.time,
          is_pinned: false,
          is_company_wide: false,
        }));

        // Batch insert all notes
        const { error: notesError } = await supabase
          .from("notes")
          .insert(notesToInsert);

        // Log error but don't fail the call - notes are secondary
        if (notesError) {
          console.error("Failed to save call notes:", notesError.message);
        }
      }

      // Create follow-up task if specified
      let taskId: string | undefined;
      if (createTask) {
        const { data: taskData, error: taskError } = await supabase
          .from("tasks")
          .insert({
            ...createTask,
            type: "follow_up",
          } as any)
          .select()
          .single();

        if (taskError) throw taskError;
        taskId = (taskData as { id: string }).id;

        // Update call with task reference
        await (supabase as any)
          .from("calls")
          .update({ follow_up_task_id: taskId })
          .eq("id", (callData as { id: string }).id);
      }

      // Update contact - fetch current data first
      const { data: currentContactData } = await supabase
        .from("contacts")
        .select("total_calls, cadence_days, dialer_status")
        .eq("id", call.contact_id)
        .single();
      
      const currentContact = currentContactData as { 
        total_calls: number | null; 
        cadence_days: number | null;
        dialer_status: string | null;
      } | null;
      
      const newTotalCalls = (currentContact?.total_calls || 0) + 1;
      
      // Calculate next call date based on cadence (use contact's custom cadence or default)
      const cadenceDays = currentContact?.cadence_days || DEFAULT_CADENCE_DAYS;
      const nextCallDate = addBusinessDays(new Date(), cadenceDays);
      
      // Build contact update object
      const contactUpdate: Record<string, any> = {
        last_contacted_at: new Date().toISOString(),
        total_calls: newTotalCalls,
        next_call_date: formatDateForDB(nextCallDate),
      };
      
      // Handle disposition-based cadence rules
      if (call.disposition) {
        // ============================================
        // New pickup dispositions (required for connected calls)
        // ============================================
        
        // Meeting booked - mark as converted (same as legacy interested_meeting)
        if (call.disposition === "meeting" || call.disposition === "interested_meeting") {
          contactUpdate.cadence_days = INTERESTED_CADENCE_DAYS;
          contactUpdate.dialer_status = "converted";
        }
        // Interested/Follow up - weekly cadence (same as legacy interested_info)
        else if (call.disposition === "interested_follow_up" || call.disposition === "interested_info") {
          contactUpdate.cadence_days = INTERESTED_CADENCE_DAYS;
        }
        // Retired - remove from dialer pool indefinitely with note
        else if (call.disposition === "retired") {
          contactUpdate.dialer_status = "paused";
          contactUpdate.dialer_paused_until = INDEFINITE_PAUSE_DATE;
          contactUpdate.dialer_pause_reason_code = "retired";
          contactUpdate.dialer_pause_reason_notes = "RETIRED";
          contactUpdate.dialer_paused_at = new Date().toISOString();
        }
        // Hang up - set next call ~2 weeks (10 business days)
        else if (call.disposition === "hang_up") {
          contactUpdate.next_call_date = formatDateForDB(
            addBusinessDays(new Date(), 10)
          );
        }
        // Wrong number - clear the phone number that was used
        else if (call.disposition === "wrong_number") {
          // Check which phone was used and clear it
          if (call.phone_used === "mobile") {
            contactUpdate.mobile = null;
          } else if (call.phone_used === "office") {
            contactUpdate.phone = null;
          }
          // If both numbers are now empty, pause from dialer
          // We'll check this after the update
        }
        // Not interested - set next call ~1 month (22 business days) and pause until then
        else if (call.disposition === "not_interested") {
          const pauseUntil = addBusinessDays(new Date(), 22);
          contactUpdate.next_call_date = formatDateForDB(pauseUntil);
          contactUpdate.dialer_status = "paused";
          contactUpdate.dialer_paused_until = formatDateForDB(pauseUntil);
          contactUpdate.dialer_paused_at = new Date().toISOString();
        }
        // Referral - no special handling, just logged
        else if (call.disposition === "referral") {
          // No special behavior - call is logged normally
        }
        // Callback requested
        else if (call.disposition === "callback") {
          // No special behavior beyond normal cadence
        }
        // Legacy: Not interested variants get paused for 30 days
        else if (call.disposition?.startsWith("not_interested_")) {
          contactUpdate.dialer_status = "paused";
          contactUpdate.dialer_paused_until = formatDateForDB(
            addBusinessDays(new Date(), NOT_INTERESTED_PAUSE_DAYS)
          );
          contactUpdate.dialer_paused_at = new Date().toISOString();
        }
        // Legacy: Do not contact - pause indefinitely
        else if (call.disposition === "do_not_contact") {
          contactUpdate.dialer_status = "paused";
          contactUpdate.dialer_paused_until = INDEFINITE_PAUSE_DATE;
          contactUpdate.dialer_pause_reason_code = "do_not_contact";
          contactUpdate.dialer_paused_at = new Date().toISOString();
        }
      }
      
      // Check if max attempts reached
      if (newTotalCalls >= MAX_CALL_ATTEMPTS && contactUpdate.dialer_status !== "converted") {
        contactUpdate.dialer_status = "exhausted";
      }
      
      const { error: contactError } = await (supabase as any)
        .from("contacts")
        .update(contactUpdate)
        .eq("id", call.contact_id);

      if (contactError) throw contactError;

      // Log activity (non-blocking: call is already saved)
      const { error: activityError } = await supabase.from("activity_log").insert({
        user_id: call.user_id,
        contact_id: call.contact_id,
        activity_type: "call",
        reference_type: "call",
        reference_id: (callData as { id: string }).id,
        summary: `Call - ${call.outcome}${call.disposition ? ` (${call.disposition})` : ""}`,
        metadata: {
          outcome: call.outcome,
          disposition: call.disposition,
          duration: call.duration_seconds,
        },
      } as any);
      if (activityError) {
        console.error("[logCall] Activity log failed (call was saved):", activityError.message);
      }

      // Update dialer session stats
      // If explicit session_id provided, use that session
      // Otherwise, fall back to auto-detection for backward compatibility
      try {
        const now = new Date();
        
        if (call.session_id) {
          // Explicit session provided - update that specific session
          const { data: existingSession } = await (supabase as any)
            .from("dialer_sessions")
            .select("*")
            .eq("id", call.session_id)
            .single();

          if (existingSession) {
            const updates: Record<string, any> = {
              total_calls: (existingSession.total_calls || 0) + 1,
              ended_at: now.toISOString(),
            };

            // Increment the appropriate outcome counter
            switch (call.outcome) {
              case "connected":
                updates.connected_calls = (existingSession.connected_calls || 0) + 1;
                updates.total_talk_time_seconds = (existingSession.total_talk_time_seconds || 0) + (call.duration_seconds || 0);
                // Track first pickup if not already set
                if (!existingSession.first_pickup_at) {
                  updates.first_pickup_at = now.toISOString();
                }
                break;
              case "voicemail":
                updates.voicemails = (existingSession.voicemails || 0) + 1;
                break;
              case "no_answer":
                updates.no_answers = (existingSession.no_answers || 0) + 1;
                break;
              case "skipped":
                updates.skipped = (existingSession.skipped || 0) + 1;
                break;
              case "gatekeeper":
                updates.gatekeepers = (existingSession.gatekeepers || 0) + 1;
                break;
              case "wrong_number":
                updates.wrong_numbers = (existingSession.wrong_numbers || 0) + 1;
                break;
              case "ai_screener":
                updates.ai_screener = (existingSession.ai_screener || 0) + 1;
                break;
            }

            // Track first meeting set if disposition indicates meeting booked
            // Supports both new "meeting" disposition and legacy "interested_meeting"
            if ((call.disposition === "meeting" || call.disposition === "interested_meeting") && !existingSession.first_meeting_set_at) {
              updates.first_meeting_set_at = now.toISOString();
              updates.meetings_booked = (existingSession.meetings_booked || 0) + 1;
            }

            await (supabase as any)
              .from("dialer_sessions")
              .update(updates)
              .eq("id", call.session_id);
          }
        } else {
          // Fallback: auto-detect session for backward compatibility
          const gapThreshold = new Date(now.getTime() - SESSION_GAP_MINUTES * 60 * 1000);

          const { data: recentSession } = await (supabase as any)
            .from("dialer_sessions")
            .select("*")
            .eq("user_id", call.user_id)
            .gte("started_at", gapThreshold.toISOString())
            .order("started_at", { ascending: false })
            .limit(1)
            .single();

          if (recentSession && (!recentSession.ended_at || new Date(recentSession.ended_at) > gapThreshold)) {
            // Update existing session
            const updates: Record<string, any> = {
              total_calls: (recentSession.total_calls || 0) + 1,
              ended_at: now.toISOString(),
            };

            switch (call.outcome) {
              case "connected":
                updates.connected_calls = (recentSession.connected_calls || 0) + 1;
                updates.total_talk_time_seconds = (recentSession.total_talk_time_seconds || 0) + (call.duration_seconds || 0);
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

            await (supabase as any)
              .from("dialer_sessions")
              .update(updates)
              .eq("id", recentSession.id);
          } else {
            // Create new auto-detected session
            await (supabase as any).from("dialer_sessions").insert({
              user_id: call.user_id,
              started_at: now.toISOString(),
              total_calls: 1,
              connected_calls: call.outcome === "connected" ? 1 : 0,
              voicemails: call.outcome === "voicemail" ? 1 : 0,
              no_answers: call.outcome === "no_answer" ? 1 : 0,
              skipped: call.outcome === "skipped" ? 1 : 0,
              gatekeepers: call.outcome === "gatekeeper" ? 1 : 0,
              wrong_numbers: call.outcome === "wrong_number" ? 1 : 0,
              ai_screener: call.outcome === "ai_screener" ? 1 : 0,
              total_talk_time_seconds: call.outcome === "connected" ? (call.duration_seconds || 0) : 0,
            });
          }
        }
      } catch (sessionError) {
        // Session tracking is non-critical, don't fail the call log
        console.error("Session tracking error:", sessionError);
      }

      return callData as Call;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calls"] });
      queryClient.invalidateQueries({ queryKey: ["calls", "session-completed"] });
      queryClient.invalidateQueries({ queryKey: ["calls", "session-stats"] });
      queryClient.invalidateQueries({ queryKey: ["calls", "today-stats"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contacts-paginated"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      queryClient.invalidateQueries({ queryKey: ["notes"] }); // Invalidate notes since we save call notes
      queryClient.invalidateQueries({ queryKey: ["dialer-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      queryClient.invalidateQueries({ queryKey: ["calls", "called-today"] });
    },
  });
}

// Get call stats for the current session (calls made since sessionStartTime)
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

export function useSessionCallStats(sessionStartTime: Date | null) {
  const supabase = createClient();

  return useQuery<SessionCallStats>({
    queryKey: ["calls", "session-stats", sessionStartTime?.toISOString()],
    queryFn: async () => {
      if (!sessionStartTime) {
        return {
          total: 0,
          connected: 0,
          voicemail: 0,
          noAnswer: 0,
          skipped: 0,
          aiScreener: 0,
          wrongNumber: 0,
          meetingsBooked: 0,
        };
      }

      // Get all calls since session started
      const { data: callData, error: callError } = await supabase
        .from("calls")
        .select("outcome, disposition")
        .gte("started_at", sessionStartTime.toISOString());

      if (callError) throw callError;

      const calls = callData as { outcome: string | null; disposition: string | null }[];

      // Get meetings booked since session started
      const { data: meetingData, error: meetingError } = await supabase
        .from("meetings")
        .select("id")
        .gte("created_at", sessionStartTime.toISOString());

      if (meetingError) throw meetingError;

      return {
        total: calls.length,
        connected: calls.filter((c) => c.outcome === "connected").length,
        voicemail: calls.filter((c) => c.outcome === "voicemail").length,
        noAnswer: calls.filter((c) => c.outcome === "no_answer").length,
        skipped: calls.filter((c) => c.outcome === "skipped").length,
        aiScreener: calls.filter((c) => c.outcome === "ai_screener").length,
        wrongNumber: calls.filter((c) => c.outcome === "wrong_number").length,
        meetingsBooked: meetingData?.length || 0,
      };
    },
    enabled: !!sessionStartTime,
    refetchInterval: 5000, // Refresh every 5 seconds for live updates
  });
}

// Get Set of contact IDs that have been called during the current session
// Used for database-based completion tracking in the call queue
export function useSessionCompletedContacts(
  sessionStartTime: Date | null,
  queueContactIds: string[]
) {
  const supabase = createClient();

  return useQuery<Set<string>>({
    // Key starts with "calls" so logCall mutation invalidates it automatically
    queryKey: ["calls", "session-completed", sessionStartTime?.toISOString(), queueContactIds],
    queryFn: async () => {
      if (!sessionStartTime || queueContactIds.length === 0) {
        return new Set<string>();
      }

      const { data, error } = await supabase
        .from("calls")
        .select("contact_id")
        .gte("started_at", sessionStartTime.toISOString())
        .in("contact_id", queueContactIds);

      if (error) throw error;

      // Return Set of unique contact IDs that have been called
      return new Set(data.map((c) => c.contact_id));
    },
    enabled: !!sessionStartTime && queueContactIds.length > 0,
    staleTime: 0, // Always refetch when invalidated for immediate UI updates
  });
}

// Get Set of contact IDs that have been called TODAY (same-day recall prevention)
// This is a HARD filter - if a contact was called today, they will not be served again today
// regardless of cadence mode or non-cadence mode
export function useContactsCalledToday() {
  const supabase = createClient();

  return useQuery<Set<string>>({
    queryKey: ["calls", "called-today"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("calls")
        .select("contact_id")
        .gte("started_at", today.toISOString())
        .neq("outcome", "skipped"); // Don't count skipped contacts

      if (error) throw error;

      // Return Set of unique contact IDs called today
      return new Set(data.map((c) => c.contact_id));
    },
    staleTime: 0, // Always refetch when invalidated
  });
}

// Helper hook: check if a specific contact was called today
export function useWasContactCalledToday(contactId: string) {
  const { data: contactsCalledToday } = useContactsCalledToday();
  return contactsCalledToday?.has(contactId) ?? false;
}
