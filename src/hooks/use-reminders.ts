"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuthId } from "@/hooks/use-auth";
import { useOutlookEvents, type OutlookEvent } from "@/hooks/use-outlook";

export type ActionType = "text_week" | "demo_2day" | "text_dayof" | "call_30" | "call_20";

export interface ReminderAction {
  key: string; // `${uid}:${action}:${date}`
  eventUid: string;
  actionType: ActionType;
  actionDate: string;     // YYYY-MM-DD (CST) the action is due
  label: string;          // "Text Curtis — meeting in a week"
  who: string;            // contact name or attendee/title
  phone: string | null;
  meetingTitle: string;
  meetingStart: string;   // ISO
  fireAt: string | null;  // for time-based (call_30/call_20): ISO moment to fire live
  done: boolean;
}

const CST = "America/Chicago";

/** YYYY-MM-DD for a date in Central time. */
function cstDay(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CST, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(d);
}
/** "h:mm a" Central. */
export function cstTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CST, hour: "numeric", minute: "2-digit",
  }).format(new Date(iso));
}

const ACTION_META: Record<ActionType, { offsetDays: number; verb: string; tail: string }> = {
  text_week: { offsetDays: 7, verb: "Text", tail: "meeting is a week out" },
  demo_2day: { offsetDays: 2, verb: "Send demo to", tail: "meeting is 2 days out" },
  text_dayof: { offsetDays: 0, verb: "Text", tail: "meeting today" },
  call_30: { offsetDays: 0, verb: "Call", tail: "30 min before" },
  call_20: { offsetDays: 0, verb: "Call", tail: "20 min before" },
};

function buildActions(events: OutlookEvent[]): ReminderAction[] {
  const out: ReminderAction[] = [];
  for (const e of events) {
    const start = new Date(e.start);
    if (Number.isNaN(start.getTime())) continue;
    const who = e.contactName || e.title;
    const mk = (actionType: ActionType, dueDate: Date, fireAt: string | null): ReminderAction => {
      const meta = ACTION_META[actionType];
      const date = cstDay(dueDate);
      return {
        key: `${e.uid}:${actionType}:${date}`,
        eventUid: e.uid,
        actionType,
        actionDate: date,
        label: `${meta.verb} ${who} — ${meta.tail}`,
        who,
        phone: e.contactPhone ?? null,
        meetingTitle: e.title,
        meetingStart: e.start,
        fireAt,
        done: false,
      };
    };
    // Date-based prep actions
    out.push(mk("text_week", new Date(start.getTime() - 7 * 86400000), null));
    out.push(mk("demo_2day", new Date(start.getTime() - 2 * 86400000), null));
    out.push(mk("text_dayof", start, null));
    // Time-based confirmation calls (fire ~30 / 20 min before)
    out.push(mk("call_30", start, new Date(start.getTime() - 30 * 60000).toISOString()));
    out.push(mk("call_20", start, new Date(start.getTime() - 20 * 60000).toISOString()));
  }
  return out;
}

/** All of today's reminder actions (CST), with done-state applied. */
export function useTodaysReminders() {
  const supabase = createClient();
  const userId = useAuthId();
  const { data: events } = useOutlookEvents();

  const today = cstDay(new Date());

  const doneQuery = useQuery<Set<string>>({
    queryKey: ["reminder-done", userId, today],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reminder_done")
        .select("event_uid, action_type, action_date")
        .eq("user_id", userId!)
        .eq("action_date", today);
      if (error) throw error;
      return new Set((data as any[]).map((r) => `${r.event_uid}:${r.action_type}:${r.action_date}`));
    },
  });

  const all = buildActions(events ?? []);
  const doneSet = doneQuery.data ?? new Set<string>();
  const todays = all
    .filter((a) => a.actionDate === today)
    .map((a) => ({ ...a, done: doneSet.has(a.key) }))
    .sort((a, b) => a.meetingStart.localeCompare(b.meetingStart));

  return {
    actions: todays,
    pending: todays.filter((a) => !a.done),
    allEventsActions: all, // for the live pre-call timer
    isLoading: doneQuery.isLoading,
  };
}

/** Mark a reminder action done (or undo). */
export function useMarkReminderDone() {
  const supabase = createClient();
  const userId = useAuthId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ action, done }: { action: ReminderAction; done: boolean }) => {
      if (done) {
        const { error } = await supabase.from("reminder_done").upsert(
          {
            user_id: userId!,
            event_uid: action.eventUid,
            action_type: action.actionType,
            action_date: action.actionDate,
          },
          { onConflict: "user_id,event_uid,action_type,action_date" }
        );
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("reminder_done")
          .delete()
          .eq("user_id", userId!)
          .eq("event_uid", action.eventUid)
          .eq("action_type", action.actionType)
          .eq("action_date", action.actionDate);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminder-done"] });
    },
  });
}
