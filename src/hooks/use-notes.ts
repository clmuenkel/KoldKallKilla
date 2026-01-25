"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Note, InsertTables, UpdateTables } from "@/types/database";

export function useNotes(filters?: {
  contactId?: string;
  limit?: number;
}) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["notes", filters],
    queryFn: async () => {
      let query = supabase
        .from("notes")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.contactId) {
        query = query.eq("contact_id", filters.contactId);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Note[];
    },
  });
}

export function useCreateNote() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (note: InsertTables<"notes">) => {
      const { data, error } = await supabase
        .from("notes")
        .insert(note)
        .select()
        .single();
      if (error) throw error;
      return data as Note;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

export function useUpdateNote() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdateTables<"notes">;
    }) => {
      const { data, error } = await supabase
        .from("notes")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Note;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}

export function useDeleteNote() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}

/**
 * Hook to fetch company-wide notes for a company
 */
export function useCompanyNotes(companyId: string | undefined | null) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["notes", "company", companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_company_wide", true)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as Note[];
    },
    enabled: !!companyId,
  });
}

/**
 * Hook to create a company-wide note
 */
export function useCreateCompanyNote() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (note: {
      user_id: string;
      contact_id: string;
      company_id: string;
      content: string;
    }) => {
      const { data, error } = await supabase
        .from("notes")
        .insert({
          user_id: note.user_id,
          contact_id: note.contact_id,
          company_id: note.company_id,
          content: note.content,
          is_company_wide: true,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Note;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["notes", "company", data.company_id] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}
