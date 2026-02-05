"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Note, Call, InsertTables, UpdateTables } from "@/types/database";

// Types for grouped notes
export interface CallWithNotes {
  call: Call;
  notes: Note[];
}

export interface GroupedNotesResult {
  pinnedNotes: Note[];
  callGroups: CallWithNotes[];
  manualNotes: Note[];
  companyNotes: Note[];
  isLoading: boolean;
}

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

/**
 * Hook to fetch grouped notes for a contact
 * Returns notes organized by: pinned, call groups, manual notes, and company notes
 */
export function useContactNotesGrouped(
  contactId: string | null | undefined,
  companyId?: string | null
): GroupedNotesResult {
  const supabase = createClient();

  // Fetch all notes for this contact
  const { data: notes, isLoading: loadingNotes } = useQuery({
    queryKey: ["notes", "grouped", contactId, companyId],
    queryFn: async () => {
      if (!contactId) return [];

      // Get notes for this contact OR company-wide notes for their company
      let query = supabase
        .from("notes")
        .select("*")
        .order("created_at", { ascending: false });

      if (companyId) {
        // Include contact notes and company-wide notes
        query = query.or(`contact_id.eq.${contactId},and(company_id.eq.${companyId},is_company_wide.eq.true)`);
      } else {
        query = query.eq("contact_id", contactId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Note[];
    },
    enabled: !!contactId,
  });

  // Fetch calls for this contact to get call metadata
  const { data: calls, isLoading: loadingCalls } = useQuery({
    queryKey: ["calls", "for-notes", contactId],
    queryFn: async () => {
      if (!contactId) return [];

      const { data, error } = await supabase
        .from("calls")
        .select("*")
        .eq("contact_id", contactId)
        .order("started_at", { ascending: false });

      if (error) throw error;
      return data as Call[];
    },
    enabled: !!contactId,
  });

  // Process and group the notes
  const result: GroupedNotesResult = {
    pinnedNotes: [],
    callGroups: [],
    manualNotes: [],
    companyNotes: [],
    isLoading: loadingNotes || loadingCalls,
  };

  if (!notes) return result;

  // Create a map of calls by ID for quick lookup
  const callsById = new Map<string, Call>();
  if (calls) {
    calls.forEach((call) => callsById.set(call.id, call));
  }

  // Group notes by call_id
  const notesByCallId = new Map<string, Note[]>();

  notes.forEach((note) => {
    // Pinned notes (can be from any source)
    if (note.is_pinned) {
      result.pinnedNotes.push(note);
    }

    // Company-wide notes
    if (note.is_company_wide && note.contact_id !== contactId) {
      result.companyNotes.push(note);
      return;
    }

    // Call notes - group by call_id
    if (note.call_id && note.source === "call") {
      const existing = notesByCallId.get(note.call_id) || [];
      existing.push(note);
      notesByCallId.set(note.call_id, existing);
      return;
    }

    // Manual notes (no call_id or source is 'manual')
    if (!note.is_pinned) {
      // Don't duplicate pinned notes
      result.manualNotes.push(note);
    }
  });

  // Build call groups with call metadata
  notesByCallId.forEach((callNotes, callId) => {
    const call = callsById.get(callId);
    if (call) {
      // Sort notes within call by timestamp
      callNotes.sort((a, b) => {
        if (!a.call_timestamp || !b.call_timestamp) return 0;
        return a.call_timestamp.localeCompare(b.call_timestamp);
      });
      result.callGroups.push({ call, notes: callNotes });
    }
  });

  // Sort call groups by call date (most recent first)
  result.callGroups.sort((a, b) => {
    return new Date(b.call.started_at).getTime() - new Date(a.call.started_at).getTime();
  });

  return result;
}

/**
 * Hook to fetch recent notes for dialer context
 * Returns last N notes + ALL pinned notes
 * Excludes company-wide notes (those appear in the Company Notes section via useCompanyNotes)
 */
export function useRecentNotes(
  contactId: string | null | undefined,
  companyId?: string | null,
  limit: number = 10
) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["notes", "recent", contactId, limit],
    queryFn: async () => {
      if (!contactId) return { pinned: [], recent: [] };

      // Fetch only contact-scoped notes (not company-wide)
      // Company-wide notes are shown in the Company Notes section via useCompanyNotes
      const { data, error } = await supabase
        .from("notes")
        .select("*, calls(id, started_at, outcome, disposition, duration_seconds)")
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const allNotes = data as (Note & { calls: Call | null })[];

      // Filter out company-wide notes (they may have contact_id set but belong to company timeline)
      const contactNotes = allNotes.filter((n) => !n.is_company_wide);

      // Separate pinned and non-pinned
      const pinned = contactNotes.filter((n) => n.is_pinned);
      const nonPinned = contactNotes.filter((n) => !n.is_pinned);

      // Take only the most recent non-pinned notes
      const recent = nonPinned.slice(0, limit);

      return { pinned, recent };
    },
    enabled: !!contactId,
  });
}

/**
 * Hook to toggle pin status on a note
 */
export function useToggleNotePin() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
      const { data, error } = await supabase
        .from("notes")
        .update({ is_pinned: isPinned })
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
