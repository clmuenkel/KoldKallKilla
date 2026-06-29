"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { MessageSquare, Image, Calendar, ChevronRight, Check } from "lucide-react";
import { useTodaysReminders, useMarkReminderDone, cstTime, type ReminderAction, type ActionType } from "@/hooks/use-reminders";
import { useIsPrimaryUser } from "@/hooks/use-primary-user";
import { copyToClipboard } from "@/lib/utils";
import { toast } from "sonner";

/** Current hour (0-23) in Central. */
function cstHour(): number {
  return Number(
    new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", hour: "numeric", hour12: false }).format(new Date())
  );
}

// Prep actions grouped by urgency — today first. Calls are NOT here (they fire
// live at the actual time); this is the readable prep checklist.
const GROUPS: { type: ActionType; title: string; sub: string; icon: React.ReactNode }[] = [
  { type: "text_dayof", title: "Text them today", sub: "Meeting is today", icon: <MessageSquare className="h-4 w-4 text-blue-500" /> },
  { type: "demo_2day", title: "Send the demo / screenshot", sub: "Meeting in 2 days", icon: <Image className="h-4 w-4 text-purple-500" /> },
  { type: "text_week", title: "Heads-up text", sub: "Meeting about a week out", icon: <Calendar className="h-4 w-4 text-emerald-500" /> },
];

/**
 * Meeting-prep reminders. Two surfaces:
 *  - a persistent thin bar (stays at the top of the content until everything's
 *    done, so it survives refreshes and reappears when you come back), and
 *  - a compact, grouped checklist dialog that auto-opens once per app load in the
 *    morning and can be reopened from the bar anytime.
 * The minute-before confirmation CALLS are handled separately as live pop-ups.
 */
export function MorningReminders() {
  const isPrimary = useIsPrimaryUser();
  const { actions, pending, isLoading } = useTodaysReminders();
  const mark = useMarkReminderDone();
  const [open, setOpen] = useState(false);
  const autoOpenedRef = useRef(false);

  // Auto-open once per mount (i.e. per page load / refresh) in the morning while
  // anything's still pending — so a refresh or coming back later re-surfaces it.
  useEffect(() => {
    if (!isPrimary || isLoading || autoOpenedRef.current) return;
    if (cstHour() >= 6 && pending.length > 0) {
      autoOpenedRef.current = true;
      setOpen(true);
    }
  }, [isPrimary, isLoading, pending.length]);

  if (!isPrimary || actions.length === 0) return null;

  const toggle = (a: ReminderAction) => mark.mutate({ action: a, done: !a.done });
  const allDone = pending.length === 0;

  const Row = ({ a }: { a: ReminderAction }) => (
    <div className="flex items-start gap-3 py-2">
      <Checkbox checked={a.done} onCheckedChange={() => toggle(a)} className="mt-0.5" />
      <button
        onClick={() => toggle(a)}
        className="flex-1 min-w-0 text-left"
      >
        <p className={a.done ? "text-sm line-through text-muted-foreground" : "text-sm font-medium"}>
          {a.who}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {a.meetingTitle} · {cstTime(a.meetingStart)} CT
        </p>
      </button>
      {a.phone && (
        <button
          className="text-xs text-primary underline shrink-0 mt-0.5"
          onClick={() => { copyToClipboard(a.phone!); toast.success("Number copied"); }}
        >
          {a.phone}
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Persistent bar — stays until everything's done */}
      {!allDone && (
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-2 border-b bg-amber-500/10 px-4 py-2 text-sm hover:bg-amber-500/15 transition-colors"
        >
          <span className="text-base leading-none">📋</span>
          <span className="font-medium">
            {pending.length} meeting-prep {pending.length === 1 ? "task" : "tasks"} for today
          </span>
          <span className="ml-auto flex items-center gap-1 text-muted-foreground">
            Open <ChevronRight className="h-4 w-4" />
          </span>
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-3 border-b">
            <DialogTitle className="flex items-center gap-2">
              📋 Today&apos;s meeting prep
            </DialogTitle>
            <DialogDescription>
              {allDone ? "All done — nice." : `${pending.length} left. Tick each as you send it.`}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto px-5 py-2">
            {allDone ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="h-12 w-12 rounded-full bg-emerald-500/15 flex items-center justify-center mb-3">
                  <Check className="h-6 w-6 text-emerald-500" />
                </div>
                <p className="font-medium">You&apos;re caught up</p>
                <p className="text-sm text-muted-foreground">All meeting-prep tasks are done for today.</p>
              </div>
            ) : (
              GROUPS.map((g) => {
                const items = actions.filter((a) => a.actionType === g.type && !a.done);
                if (items.length === 0) return null;
                return (
                  <div key={g.type} className="py-2 border-b last:border-0">
                    <div className="flex items-center gap-2 mb-1">
                      {g.icon}
                      <span className="text-sm font-semibold">{g.title}</span>
                      <span className="text-xs text-muted-foreground">· {g.sub}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{items.length}</span>
                    </div>
                    <div className="pl-0.5">
                      {items.map((a) => <Row key={a.key} a={a} />)}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter className="px-5 py-3 border-t">
            <Button variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">
              {allDone ? "Close" : "Close — I'll finish later"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
