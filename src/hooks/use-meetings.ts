"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Meeting, MeetingWithContact, InsertTables, UpdateTables } from "@/types/database";

export function useMeetings(filters?: {
  contactId?: string;
  companyId?: string;
  status?: string;
  upcoming?: boolean;
  past?: boolean;
  limit?: number;
}) {
  const supabase = createClient();

  return useQuery<MeetingWithContact[]>({
    queryKey: ["meetings", filters],
    queryFn: async () => {
      // Disambiguate contacts relationship:
      // meetings has a direct FK (meetings.contact_id -> contacts.id) AND an indirect many-to-many via meeting_attendees.
      const selectWithAttendees =
        "*, contacts!meetings_contact_id_fkey(id, first_name, last_name, company_name, title), meeting_attendees(contact_id, contacts!meeting_attendees_contact_id_fkey(id, first_name, last_name, company_name, title))";
      let query = supabase
        .from("meetings")
        .select(selectWithAttendees);

      if (filters?.contactId) {
        const contactId = filters.contactId;
        const { data: attendeeRows } = await supabase
          .from("meeting_attendees")
          .select("meeting_id")
          .eq("contact_id", contactId);
        const meetingIdsFromAttendees = (attendeeRows ?? []).map(
          (r) => r.meeting_id
        );
        if (meetingIdsFromAttendees.length > 0) {
          query = query.or(
            `contact_id.eq.${contactId},id.in.(${meetingIdsFromAttendees.join(",")})`
          );
        } else {
          query = query.eq("contact_id", contactId);
        }
      }

      if (filters?.companyId) {
        query = query.eq("company_id", filters.companyId);
      }

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      if (filters?.upcoming) {
        query = query
          .eq("status", "scheduled")
          .gte("scheduled_at", new Date().toISOString())
          .order("scheduled_at", { ascending: true });
      } else if (filters?.past) {
        query = query
          .lt("scheduled_at", new Date().toISOString())
          .order("scheduled_at", { ascending: false });
      } else {
        // Default: newest first
        query = query.order("scheduled_at", { ascending: false });
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as MeetingWithContact[];
    },
  });
}

export function useAllMeetings() {
  const supabase = createClient();

  return useQuery<MeetingWithContact[]>({
    queryKey: ["meetings", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meetings")
        .select(
          "*, contacts!meetings_contact_id_fkey(id, first_name, last_name, company_name, title)"
        )
        .order("scheduled_at", { ascending: false });

      if (error) throw error;
      return data as unknown as MeetingWithContact[];
    },
  });
}

// ── Meeting sequence ("1st show / 2nd show / 3rd show" per prospect) ──────────
// Rank each contact's non-cancelled meetings by scheduled_at; position is 1-based.
// A per-meeting `sequence_override` wins (so a meeting whose earlier ones aren't
// in the CRM can still be labelled "2nd"). Meetings with no contact have no
// position (excluded until linked).
type SeqMeeting = {
  id: string;
  contact_id: string | null;
  scheduled_at: string;
  status: string;
  sequence_override: number | null;
};

export function computeMeetingPositions(meetings: SeqMeeting[]): Map<string, number> {
  const byContact = new Map<string, SeqMeeting[]>();
  for (const m of meetings) {
    if (!m.contact_id) continue;
    if (m.status === "cancelled" || m.status === "rescheduled") continue;
    const list = byContact.get(m.contact_id) ?? [];
    list.push(m);
    byContact.set(m.contact_id, list);
  }
  const pos = new Map<string, number>();
  for (const list of byContact.values()) {
    list.sort(
      (a, b) =>
        new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime() ||
        a.id.localeCompare(b.id)
    );
    list.forEach((m, i) => pos.set(m.id, m.sequence_override ?? i + 1));
  }
  return pos;
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** This meeting's position in its contact's meeting sequence (null if unlinked). */
export function useMeetingPosition(meeting: MeetingWithContact | null | undefined) {
  // Always pass a contactId so the query is stable; "__none__" returns nothing.
  const { data: contactMeetings } = useMeetings({
    contactId: meeting?.contact_id ?? "__none__",
  });
  if (!meeting || !meeting.contact_id || !contactMeetings) return null;
  const positions = computeMeetingPositions(contactMeetings as unknown as SeqMeeting[]);
  return positions.get(meeting.id) ?? null;
}

export function useMeeting(id: string) {
  const supabase = createClient();

  return useQuery<MeetingWithContact | null>({
    queryKey: ["meetings", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("meetings")
        .select(
          "*, contacts!meetings_contact_id_fkey(id, first_name, last_name, company_name, title, email, phone)"
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as unknown as MeetingWithContact;
    },
    enabled: !!id,
  });
}

export function useNextCompanyMeeting(companyId: string | undefined) {
  const supabase = createClient();

  return useQuery<MeetingWithContact | null>({
    queryKey: ["meetings", "next-company", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meetings")
        .select("*, contacts!meetings_contact_id_fkey(id, first_name, last_name, company_name, title)")
        .eq("company_id", companyId!)
        .eq("status", "scheduled")
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as MeetingWithContact | null;
    },
    enabled: !!companyId,
  });
}

export function useUpcomingMeetings(days: number = 7) {
  const supabase = createClient();

  return useQuery<MeetingWithContact[]>({
    queryKey: ["meetings", "upcoming", days],
    queryFn: async () => {
      // Use start of today instead of now, so all today's meetings show
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      const { data, error } = await supabase
        .from("meetings")
        .select(
          "*, contacts!meetings_contact_id_fkey(id, first_name, last_name, company_name, title), meeting_attendees(contact_id, contacts!meeting_attendees_contact_id_fkey(id, first_name, last_name, company_name, title))"
        )
        .eq("status", "scheduled")
        .gte("scheduled_at", startOfToday.toISOString())
        .lte("scheduled_at", futureDate.toISOString())
        .order("scheduled_at", { ascending: true });

      if (error) throw error;
      return data as unknown as MeetingWithContact[];
    },
  });
}

export function useTodaysMeetings() {
  const supabase = createClient();

  return useQuery<MeetingWithContact[]>({
    queryKey: ["meetings", "today"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data, error } = await supabase
        .from("meetings")
        .select(
          "*, contacts!meetings_contact_id_fkey(id, first_name, last_name, company_name, title), meeting_attendees(contact_id, contacts!meeting_attendees_contact_id_fkey(id, first_name, last_name, company_name, title))"
        )
        .eq("status", "scheduled")
        .gte("scheduled_at", today.toISOString())
        .lt("scheduled_at", tomorrow.toISOString())
        .order("scheduled_at", { ascending: true });

      if (error) throw error;
      return data as unknown as MeetingWithContact[];
    },
  });
}

export function useMeetingsBookedToday() {
  const supabase = createClient();

  return useQuery<number>({
    // Keyed under "calls" so it refreshes when a call is logged.
    queryKey: ["calls", "meetings-booked-today"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // "Meetings booked today" = meetings set FROM dials (call disposition),
      // not every meetings-table row created today (which includes follow-ups
      // Zad books himself and anything synced from Outlook). Mirrors use-analytics.
      const { data, error } = await supabase
        .from("calls")
        .select("disposition, outcome")
        .gte("started_at", today.toISOString());

      if (error) throw error;
      return (data || []).filter(
        (c) =>
          c.outcome === "connected" &&
          (c.disposition === "meeting" || c.disposition === "interested_meeting")
      ).length;
    },
  });
}

export function useCreateMeeting() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payload: InsertTables<"meetings"> & { attendee_ids?: string[] }
    ) => {
      const { attendee_ids, ...meeting } = payload;
      const { data, error } = await supabase
        .from("meetings")
        .insert(meeting)
        .select()
        .single();
      if (error) throw error;
      const primaryId = data?.contact_id ?? meeting.contact_id;
      if (primaryId) {
        await supabase.from("contacts").update({ stage: "meeting" }).eq("id", primaryId);
      }
      const extraIds = (attendee_ids ?? []).filter((id) => id && id !== primaryId);
      if (extraIds.length > 0) {
        await supabase.from("meeting_attendees").insert(
          extraIds.map((contact_id) => ({ meeting_id: data.id, contact_id }))
        );
      }
      return data as Meeting;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contacts-paginated"] });
      queryClient.invalidateQueries({ queryKey: ["dialer-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["current-session"] });
    },
  });
}

export function useUpdateMeeting() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdateTables<"meetings">;
    }) => {
      const { data, error } = await supabase
        .from("meetings")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Meeting;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
    },
  });
}

export function useSetMeetingAttendees() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      meetingId,
      primaryContactId,
      additionalAttendeeIds = [],
    }: {
      meetingId: string;
      primaryContactId: string;
      additionalAttendeeIds?: string[];
    }) => {
      await supabase.from("meeting_attendees").delete().eq("meeting_id", meetingId);
      const extraIds = additionalAttendeeIds.filter((id) => id && id !== primaryContactId);
      if (extraIds.length > 0) {
        const { error } = await supabase.from("meeting_attendees").insert(
          extraIds.map((contact_id) => ({ meeting_id: meetingId, contact_id }))
        );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
    },
  });
}

export function useCompleteMeeting() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      outcome,
      notes,
    }: {
      id: string;
      outcome: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("meetings")
        .update({
          status: "completed",
          outcome,
          outcome_notes: notes,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Meeting;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
    },
  });
}

export function useCancelMeeting() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("meetings")
        .update({ status: "cancelled" })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Meeting;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
    },
  });
}

export function useDeleteMeeting() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("meetings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
    },
  });
}
