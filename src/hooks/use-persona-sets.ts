"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { PersonaSet, InsertTables, UpdateTables } from "@/types/database";

/**
 * Fetch all persona sets for the user
 */
export function usePersonaSets() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["persona-sets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("persona_sets")
        .select("*")
        .order("is_default", { ascending: false })
        .order("name", { ascending: true });

      if (error) throw error;
      return data as PersonaSet[];
    },
  });
}

/**
 * Fetch a single persona set
 */
export function usePersonaSet(id: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["persona-set", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("persona_sets")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as PersonaSet;
    },
    enabled: !!id,
  });
}

/**
 * Get the default persona set
 */
export function useDefaultPersonaSet() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["persona-set", "default"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("persona_sets")
        .select("*")
        .eq("is_default", true)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data as PersonaSet | null;
    },
  });
}

/**
 * Create a new persona set
 */
export function useCreatePersonaSet() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (personaSet: InsertTables<"persona_sets">) => {
      // If this is set as default, unset other defaults first
      if (personaSet.is_default) {
        await supabase
          .from("persona_sets")
          .update({ is_default: false })
          .eq("user_id", personaSet.user_id);
      }

      const { data, error } = await supabase
        .from("persona_sets")
        .insert(personaSet)
        .select()
        .single();

      if (error) throw error;
      return data as PersonaSet;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["persona-sets"] });
    },
  });
}

/**
 * Update a persona set
 */
export function useUpdatePersonaSet() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdateTables<"persona_sets">;
    }) => {
      // If setting as default, unset other defaults first
      if (updates.is_default) {
        const { data: current } = await supabase
          .from("persona_sets")
          .select("user_id")
          .eq("id", id)
          .single();

        if (current) {
          await supabase
            .from("persona_sets")
            .update({ is_default: false })
            .eq("user_id", current.user_id)
            .neq("id", id);
        }
      }

      const { data, error } = await supabase
        .from("persona_sets")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as PersonaSet;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["persona-sets"] });
      queryClient.invalidateQueries({ queryKey: ["persona-set", data.id] });
    },
  });
}

/**
 * Delete a persona set
 */
export function useDeletePersonaSet() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("persona_sets")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["persona-sets"] });
    },
  });
}

/**
 * Duplicate a persona set
 */
export function useDuplicatePersonaSet() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, newName }: { id: string; newName: string }) => {
      // Get the original
      const { data: original, error: fetchError } = await supabase
        .from("persona_sets")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      // Create duplicate
      const { data, error } = await supabase
        .from("persona_sets")
        .insert({
          user_id: original.user_id,
          name: newName,
          titles: original.titles,
          industries: original.industries,
          employee_ranges: original.employee_ranges,
          include_intent_data: original.include_intent_data,
          is_default: false, // Never duplicate as default
        })
        .select()
        .single();

      if (error) throw error;
      return data as PersonaSet;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["persona-sets"] });
    },
  });
}

// Pre-built persona set templates
export const PERSONA_SET_TEMPLATES = {
  finance_healthcare: {
    name: "Finance Leaders - Healthcare",
    titles: [
      "CFO",
      "Chief Financial Officer",
      "VP Finance",
      "VP of Finance",
      "Director of Finance",
      "Controller",
      "Treasurer",
      "Finance Director",
    ],
    industries: ["hospitals", "healthcare", "medical"],
    employee_ranges: ["1001-5000", "5001+"],
  },
  finance_banking: {
    name: "Finance Leaders - Banking/Credit Unions",
    titles: [
      "CFO",
      "Chief Financial Officer",
      "VP Finance",
      "VP of Finance",
      "Director of Finance",
      "Controller",
      "Treasurer",
    ],
    industries: ["credit_unions", "banking", "financial_services"],
    employee_ranges: ["501-1000", "1001-5000", "5001+"],
  },
  it_healthcare: {
    name: "IT Leaders - Healthcare",
    titles: [
      "CIO",
      "CTO",
      "Chief Information Officer",
      "Chief Technology Officer",
      "VP IT",
      "VP of IT",
      "IT Director",
      "Director of IT",
    ],
    industries: ["hospitals", "healthcare", "medical"],
    employee_ranges: ["1001-5000", "5001+"],
  },
  operations_all: {
    name: "Operations Leaders",
    titles: [
      "COO",
      "Chief Operating Officer",
      "VP Operations",
      "VP of Operations",
      "Operations Director",
      "Director of Operations",
    ],
    industries: [],
    employee_ranges: ["1001-5000", "5001+"],
  },
  c_suite: {
    name: "C-Suite Executives",
    titles: ["CEO", "CFO", "COO", "CIO", "CTO", "President", "Chief Executive Officer"],
    industries: [],
    employee_ranges: ["501-1000", "1001-5000", "5001+"],
  },
};
