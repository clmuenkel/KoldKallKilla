"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Contact, InsertTables, UpdateTables } from "@/types/database";

export function useContacts(filters?: {
  stage?: string;
  search?: string;
  limit?: number;
}) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["contacts", filters],
    queryFn: async () => {
      let query = supabase
        .from("contacts")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.stage && filters.stage !== "all") {
        query = query.eq("stage", filters.stage);
      }

      if (filters?.search) {
        query = query.or(
          `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
        );
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Contact[];
    },
  });
}

export function useContact(id: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["contact", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Contact;
    },
    enabled: !!id,
  });
}

export function useCreateContact() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contact: InsertTables<"contacts">) => {
      const { data, error } = await supabase
        .from("contacts")
        .insert(contact)
        .select()
        .single();
      if (error) throw error;
      return data as Contact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

export function useUpdateContact() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdateTables<"contacts">;
    }) => {
      const { data, error } = await supabase
        .from("contacts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Contact;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contact", data.id] });
    },
  });
}

export function useDeleteContact() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

export function useBulkCreateContacts() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contacts: InsertTables<"contacts">[]) => {
      const { data, error } = await supabase
        .from("contacts")
        .insert(contacts)
        .select();
      if (error) throw error;
      return data as Contact[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

export function useContactsByStage() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["contacts-by-stage"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("stage")
        .eq("status", "active");
      
      if (error) throw error;

      const counts: Record<string, number> = {};
      data.forEach((contact) => {
        counts[contact.stage] = (counts[contact.stage] || 0) + 1;
      });
      
      return counts;
    },
  });
}
