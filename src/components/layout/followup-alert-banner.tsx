"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Clock, X } from "lucide-react";
import { useFollowUpsDue, useMissedMeetingContacts } from "@/hooks/use-followups";

/**
 * Quiet, consolidated alert shown at the top of the dashboard: who asked to be
 * called back today and which meetings were missed. One line, dismissible for
 * the session (Phase 1). Phase 2 will replace the per-session dismiss with the
 * real cross-device 2-alert throttle (follow_up_alerted_at / follow_up_alert_count).
 */
const DISMISS_KEY = "followup_alert_dismissed_v1";

export function FollowUpAlertBanner() {
  const { data: followUps } = useFollowUpsDue();
  const { data: missed } = useMissedMeetingContacts();
  // Start dismissed so nothing flashes before we read sessionStorage on mount.
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  const followUpCount = followUps?.length ?? 0;
  const missedCount = missed?.length ?? 0;

  if (dismissed || (followUpCount === 0 && missedCount === 0)) return null;

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="flex items-center gap-2 border-b bg-primary/5 px-4 py-2 text-sm">
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
      {missedCount > 0 && (
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
