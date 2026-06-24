"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Clock, X } from "lucide-react";
import {
  useFollowUpAlerts,
  useMissedMeetingContacts,
  useMarkFollowUpsAlerted,
} from "@/hooks/use-followups";
import { useIsPrimaryUser } from "@/hooks/use-primary-user";

/**
 * Quiet, consolidated alert at the top of the dashboard: who asked to be called
 * back, and which meetings were missed.
 *
 * Follow-ups use a cross-device throttle (useFollowUpAlerts): each follow-up is
 * alerted at most twice — the day it's due, then once ~3 days later, excluding
 * anyone reached since — then it goes silent while staying in the Follow-ups Due
 * dialer queue. Dismissing (X) is the acknowledgement that starts that ~3-day
 * window. Missed meetings stay a simple count, hidden for the session on dismiss.
 */
const MISSED_DISMISS_KEY = "missed_alert_dismissed_v1";

export function FollowUpAlertBanner() {
  const isPrimaryUser = useIsPrimaryUser();
  const { data: followUpAlerts } = useFollowUpAlerts();
  const { data: missed } = useMissedMeetingContacts();
  const markAlerted = useMarkFollowUpsAlerted();

  const [mounted, setMounted] = useState(false);
  const [missedDismissed, setMissedDismissed] = useState(true);

  useEffect(() => {
    setMounted(true);
    setMissedDismissed(sessionStorage.getItem(MISSED_DISMISS_KEY) === "1");
  }, []);

  const followUpCount = followUpAlerts?.length ?? 0;
  const missedCount = missed?.length ?? 0;
  const showMissed = missedCount > 0 && !missedDismissed;

  // Only Zad's login gets these features; every other login keeps the original CRM.
  if (!isPrimaryUser) return null;
  if (!mounted || (followUpCount === 0 && !showMissed)) return null;

  const dismiss = () => {
    // Acknowledging advances the follow-up throttle and hides the missed count.
    if (followUpAlerts && followUpAlerts.length > 0) {
      markAlerted.mutate(
        followUpAlerts.map((c) => ({
          id: c.id,
          follow_up_alert_count: c.follow_up_alert_count,
        }))
      );
    }
    sessionStorage.setItem(MISSED_DISMISS_KEY, "1");
    setMissedDismissed(true);
  };

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b bg-primary/5 px-4 py-2 text-sm">
      <span className="font-medium text-muted-foreground shrink-0">Today</span>
      {followUpCount > 0 && (
        <Link
          href="/dialer?category=follow_ups_due"
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-primary/10 transition-colors"
        >
          <Clock className="h-4 w-4 text-primary shrink-0" />
          <span>
            <strong>{followUpCount}</strong>{" "}
            {followUpCount === 1 ? "person" : "people"} asked you to call back
          </span>
        </Link>
      )}
      {showMissed && (
        <Link
          href="/dialer?category=missed_meetings"
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-amber-500/10 transition-colors"
        >
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
          <span>
            <strong>{missedCount}</strong> missed{" "}
            {missedCount === 1 ? "meeting" : "meetings"} to follow up
          </span>
        </Link>
      )}
      <button
        onClick={dismiss}
        className="ml-auto shrink-0 text-muted-foreground hover:text-foreground"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
