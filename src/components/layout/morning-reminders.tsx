"use client";

import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Image, Phone, Sun } from "lucide-react";
import { useTodaysReminders, useMarkReminderDone, cstTime, type ReminderAction } from "@/hooks/use-reminders";
import { useIsPrimaryUser } from "@/hooks/use-primary-user";
import { copyToClipboard } from "@/lib/utils";
import { toast } from "sonner";

const ICON: Record<string, React.ReactNode> = {
  text_week: <MessageSquare className="h-4 w-4 text-blue-500" />,
  text_dayof: <MessageSquare className="h-4 w-4 text-blue-500" />,
  demo_2day: <Image className="h-4 w-4 text-purple-500" />,
  call_30: <Phone className="h-4 w-4 text-emerald-500" />,
  call_20: <Phone className="h-4 w-4 text-emerald-500" />,
};

/** Today in Central time, as a stable key for per-day session dismissal. */
function cstTodayKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}
/** Current hour (0-23) in Central. */
function cstHour(): number {
  return Number(
    new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", hour: "numeric", hour12: false }).format(new Date())
  );
}

/**
 * Morning meeting-reminder pop-up. Appears once per app-open (session) after
 * 6 AM CST when there are still-pending actions for today. Must be worked
 * through as a checklist; reappears next time the app is opened if anything's
 * left. Re-reads the calendar on every open.
 */
export function MorningReminders() {
  const isPrimary = useIsPrimaryUser();
  const { actions, pending, isLoading } = useTodaysReminders();
  const mark = useMarkReminderDone();
  const [open, setOpen] = useState(false);

  const dayKey = cstTodayKey();
  const dismissKey = `morning_reminders_dismissed_${dayKey}`;

  useEffect(() => {
    if (!isPrimary || isLoading) return;
    const dismissed = sessionStorage.getItem(dismissKey) === "1";
    const afterSix = cstHour() >= 6;
    if (afterSix && !dismissed && pending.length > 0) setOpen(true);
  }, [isPrimary, isLoading, pending.length, dismissKey]);

  if (!isPrimary || actions.length === 0) return null;

  const close = () => {
    sessionStorage.setItem(dismissKey, "1");
    setOpen(false);
  };

  const toggle = (a: ReminderAction) =>
    mark.mutate({ action: a, done: !a.done });

  const Row = ({ a }: { a: ReminderAction }) => {
    const isCall = a.actionType === "call_30" || a.actionType === "call_20";
    return (
      <div className="flex items-start gap-3 py-2.5 border-b last:border-0">
        <Checkbox checked={a.done} onCheckedChange={() => toggle(a)} className="mt-0.5" />
        <span className="mt-0.5 shrink-0">{ICON[a.actionType]}</span>
        <div className="flex-1 min-w-0">
          <p className={a.done ? "text-sm line-through text-muted-foreground" : "text-sm font-medium"}>
            {a.label}
            {isCall && a.fireAt && (
              <span className="text-muted-foreground font-normal"> · {cstTime(a.fireAt)} CT</span>
            )}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {a.meetingTitle} · {cstTime(a.meetingStart)} CT
            {a.phone && (
              <button
                className="ml-2 underline hover:text-foreground"
                onClick={() => { copyToClipboard(a.phone!); toast.success("Number copied"); }}
              >
                {a.phone}
              </button>
            )}
          </p>
        </div>
      </div>
    );
  };

  const doneCount = actions.filter((a) => a.done).length;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5 text-amber-500" />
            Today&apos;s meeting reminders
            <Badge variant="secondary" className="ml-1">{doneCount}/{actions.length}</Badge>
          </DialogTitle>
          <DialogDescription>
            Work the list. Tick each as you do it.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[55vh] overflow-y-auto -mx-1 px-1">
          {actions.map((a) => <Row key={a.key} a={a} />)}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            {pending.length === 0 ? "All done — close" : "Close for now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
