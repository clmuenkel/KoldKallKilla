"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Call, InsertTables } from "@/types/database";

export function useCalls(filters?: {
  contactId?: string;
  limit?: number;
  today?: boolean;
}) {
  const supabase = createClient();

  return useQuery({
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
      return data;
    },
  });
}

export function useTodayCallStats() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["calls", "today-stats"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("calls")
        .select("outcome, disposition")
        .gte("started_at", today.toISOString());

      if (error) throw error;

      const stats = {
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
        .insert(call)
        .select()
        .single();
      if (error) throw error;

      // Update contact's last_contacted_at and total_calls
      await supabase
        .from("contacts")
        .update({
          last_contacted_at: new Date().toISOString(),
          total_calls: supabase.rpc("increment_calls", { contact_id: call.contact_id }),
        })
        .eq("id", call.contact_id);

      return data as Call;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calls"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
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
      // Insert the call
      const { data: callData, error: callError } = await supabase
        .from("calls")
        .insert(call)
        .select()
        .single();
      
      if (callError) throw callError;

      // Create follow-up task if specified
      let taskId: string | undefined;
      if (createTask) {
        const { data: taskData, error: taskError } = await supabase
          .from("tasks")
          .insert({
            ...createTask,
            type: "follow_up",
          })
          .select()
          .single();

        if (taskError) throw taskError;
        taskId = taskData.id;

        // Update call with task reference
        await supabase
          .from("calls")
          .update({ follow_up_task_id: taskId })
          .eq("id", callData.id);
      }

      // Update contact
      const { error: contactError } = await supabase
        .from("contacts")
        .update({
          last_contacted_at: new Date().toISOString(),
          total_calls: supabase.sql`total_calls + 1`,
        })
        .eq("id", call.contact_id);

      if (contactError) throw contactError;

      // Log activity
      await supabase.from("activity_log").insert({
        user_id: call.user_id,
        contact_id: call.contact_id,
        activity_type: "call",
        reference_type: "call",
        reference_id: callData.id,
        summary: `Call - ${call.outcome}${call.disposition ? ` (${call.disposition})` : ""}`,
        metadata: {
          outcome: call.outcome,
          disposition: call.disposition,
          duration: call.duration_seconds,
        },
      });

      return callData as Call;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calls"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}
