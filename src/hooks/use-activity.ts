"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { ActivityLog, InsertTables } from "@/types/database";

export function useActivity(filters?: {
  contactId?: string;
  limit?: number;
}) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["activity", filters],
    queryFn: async () => {
      let query = supabase
        .from("activity_log")
        .select("*, contacts(id, first_name, last_name)")
        .order("created_at", { ascending: false });

      if (filters?.contactId) {
        query = query.eq("contact_id", filters.contactId);
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

export function useRecentActivity() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["activity", "recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_log")
        .select("*, contacts(id, first_name, last_name, company_name)")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });
}

export function useLogActivity() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (activity: InsertTables<"activity_log">) => {
      const { data, error } = await supabase
        .from("activity_log")
        .insert(activity)
        .select()
        .single();
      if (error) throw error;
      return data as ActivityLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}
