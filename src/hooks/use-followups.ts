"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import type { Contact } from "@/types/database";

/** Dated no-show note text, dropped on the contact when a meeting is marked missed. */
export function noShowNoteContent(title: string, scheduledAt: string): string {
  const when = format(new Date(scheduledAt), "EEE, MMM d yyyy 'at' h:mm a");
  return `🚫 No-show — "${title}" was scheduled ${when}.`;
}

/**
 * Helpers for the two human-driven dialer queues: "Follow-ups Due" and
 * "Missed Meetings". These are explicit, Zad-curated lists — NOT the
 * auto-dialer cadence. They intentionally ignore the dialer pool so that
 * meeting/proposal-stage contacts (often out of pool) still surface.
 *
 * RLS scopes every query to the logged-in user, so no user_id filter here.
 */

/** End of the current local day, as an ISO string (inclusive due boundary). */
function endOfTodayISO(): string {
  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999
  ).toISOString();
}

/**
 * Contacts with a follow-up date that is due (today or overdue).
 * Stays in the list until Zad books a meeting, connects on a call, or
 * sets a new date — never auto-removed.
 */
export function useFollowUpsDue() {
  const supabase = createClient();

  return useQuery<Contact[]>({
    queryKey: ["followups-due"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .not("next_follow_up", "is", null)
        .lte("next_follow_up", endOfTodayISO())
        .order("next_follow_up", { ascending: true });
      if (error) throw error;
      return (data as Contact[]) ?? [];
    },
  });
}

/**
 * Contacts who have a missed meeting (status='no_show' or legacy
 * outcome='no_show') AND no upcoming scheduled meeting. Booking a new
 * meeting auto-clears them. won/lost contacts are excluded.
 */
export function useMissedMeetingContacts() {
  const supabase = createClient();

  return useQuery<Contact[]>({
    queryKey: ["missed-meetings"],
    queryFn: async () => {
      // 1. Meetings that count as missed (new status or legacy outcome).
      const { data: missedRows, error: missedErr } = await supabase
        .from("meetings")
        .select("contact_id")
        .or("status.eq.no_show,outcome.eq.no_show");
      if (missedErr) throw missedErr;

      const missedIds = new Set(
        (missedRows ?? []).map((r) => r.contact_id).filter(Boolean) as string[]
      );
      if (missedIds.size === 0) return [];

      // 2. Contacts with an upcoming scheduled meeting are already re-booked.
      const { data: upcomingRows, error: upcomingErr } = await supabase
        .from("meetings")
        .select("contact_id")
        .eq("status", "scheduled")
        .gte("scheduled_at", new Date().toISOString());
      if (upcomingErr) throw upcomingErr;

      const upcomingIds = new Set(
        (upcomingRows ?? []).map((r) => r.contact_id).filter(Boolean) as string[]
      );

      const targetIds = [...missedIds].filter((id) => !upcomingIds.has(id));
      if (targetIds.length === 0) return [];

      // 3. Fetch those contacts, excluding closed (won/lost) deals.
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .in("id", targetIds)
        .not("stage", "in", "(won,lost)");
      if (error) throw error;
      return (data as Contact[]) ?? [];
    },
  });
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * The subset of due follow-ups that should be ALERTED right now (banner), as
 * opposed to merely living in the dialer queue. Throttled to at most two alerts
 * per follow-up: the first time it comes due, then once more ~3 days after the
 * last alert. Anyone reached since the follow-up date is excluded. After two
 * alerts it goes quiet (but stays in the Follow-ups Due queue).
 */
export function useFollowUpAlerts() {
  const due = useFollowUpsDue();
  const now = Date.now();

  const contacts = (due.data ?? []).filter((c) => {
    // Reached since the follow-up came due → already handled, no alert.
    if (
      c.last_contacted_at &&
      c.next_follow_up &&
      new Date(c.last_contacted_at).getTime() >= new Date(c.next_follow_up).getTime()
    ) {
      return false;
    }
    const count = c.follow_up_alert_count ?? 0;
    if (count >= 2) return false; // used up both alerts
    if (count === 0) return true; // first alert
    // count === 1: only re-alert once ~3 days after the first alert.
    if (!c.follow_up_alerted_at) return true;
    return now >= new Date(c.follow_up_alerted_at).getTime() + THREE_DAYS_MS;
  });

  return { ...due, data: contacts };
}

/**
 * Record that a set of contacts were just alerted: bump their alert count and
 * stamp the time. Called when Zad acknowledges (dismisses) the banner, so the
 * ~3-day window for the second alert is measured from acknowledgement.
 */
export function useMarkFollowUpsAlerted() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      contacts: { id: string; follow_up_alert_count: number | null }[]
    ) => {
      const stamp = new Date().toISOString();
      await Promise.all(
        contacts.map((c) =>
          supabase
            .from("contacts")
            .update({
              follow_up_alert_count: (c.follow_up_alert_count ?? 0) + 1,
              follow_up_alerted_at: stamp,
            })
            .eq("id", c.id)
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["followups-due"] });
    },
  });
}

/** Mark a meeting as missed (no-show). First-class status, not an outcome. */
export function useMarkMeetingMissed() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (meetingId: string) => {
      const { data, error } = await supabase
        .from("meetings")
        .update({ status: "no_show" })
        .eq("id", meetingId)
        .select()
        .single();
      if (error) throw error;
      // Drop a dated note on the contact so the no-show is easy to see on their page.
      const m = data as {
        contact_id: string | null;
        user_id: string;
        title: string;
        scheduled_at: string;
      };
      if (m?.contact_id) {
        await supabase.from("notes").insert({
          user_id: m.user_id,
          contact_id: m.contact_id,
          content: noShowNoteContent(m.title, m.scheduled_at),
          source: "manual",
        });
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["missed-meetings"] });
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}

/**
 * Remove a contact from the Missed Meetings queue without booking a new meeting.
 * Resolves all their no-show meetings (status/outcome -> 'no_show_resolved') so
 * they no longer match the missed-meetings query, while preserving the history
 * that it was a no-show.
 */
export function useDismissMissedMeeting() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contactId: string) => {
      const { error } = await supabase
        .from("meetings")
        .update({ status: "no_show_resolved", outcome: "no_show_resolved" })
        .eq("contact_id", contactId)
        .or("status.eq.no_show,outcome.eq.no_show");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["missed-meetings"] });
    },
  });
}

/**
 * Set (or clear) a contact's follow-up date. Setting a date also pushes the
 * auto-dialer's next_call_date to that day so the dialer won't surface them
 * before the prospect asked to be called. Pass date=null to clear.
 */
export function useSetFollowUp() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      date,
    }: {
      id: string;
      date: string | null;
    }) => {
      const updates =
        date === null
          ? { next_follow_up: null }
          : { next_follow_up: date, next_call_date: date };
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
      queryClient.invalidateQueries({ queryKey: ["contacts-paginated"] });
      queryClient.invalidateQueries({ queryKey: ["contact", data.id] });
      queryClient.invalidateQueries({ queryKey: ["followups-due"] });
    },
  });
}
