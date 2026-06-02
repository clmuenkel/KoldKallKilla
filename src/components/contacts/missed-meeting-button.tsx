"use client";

import { useMeetings } from "@/hooks/use-meetings";
import { useMarkMeetingMissed, useDismissMissedMeeting } from "@/hooks/use-followups";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X } from "lucide-react";
import { isPast, isFuture } from "date-fns";
import { toast } from "sonner";

/**
 * Contact-page missed-meeting actions:
 * - "Mark missed" when the contact has an unresolved past (still-scheduled) meeting.
 * - "Remove from Missed Meetings" when the contact is currently in the Missed
 *   Meetings queue (has a no-show and no upcoming meeting) and Zad handled it
 *   another way.
 * Renders nothing when neither applies.
 */
export function MissedMeetingButton({ contactId }: { contactId: string }) {
  const { data: meetings } = useMeetings({ contactId });
  const markMissed = useMarkMeetingMissed();
  const dismiss = useDismissMissedMeeting();

  const list = meetings ?? [];
  const pastScheduled = list
    .filter((m) => m.status === "scheduled" && isPast(new Date(m.scheduled_at)))
    .sort(
      (a, b) =>
        new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()
    )[0];

  const hasNoShow = list.some((m) => m.status === "no_show" || m.outcome === "no_show");
  const hasUpcoming = list.some(
    (m) => m.status === "scheduled" && isFuture(new Date(m.scheduled_at))
  );
  const isMissed = hasNoShow && !hasUpcoming;

  return (
    <>
      {pastScheduled && (
        <Button
          variant="outline"
          className="text-amber-600 border-amber-500/40 hover:bg-amber-500/10"
          disabled={markMissed.isPending}
          onClick={async () => {
            try {
              await markMissed.mutateAsync(pastScheduled.id);
              toast.success("Marked missed — added to Missed Meetings + note on the contact.");
            } catch (e: any) {
              toast.error(e.message || "Failed to mark missed");
            }
          }}
        >
          <AlertTriangle className="mr-2 h-4 w-4" />
          Mark missed
        </Button>
      )}
      {isMissed && (
        <Button
          variant="outline"
          className="text-muted-foreground"
          disabled={dismiss.isPending}
          onClick={async () => {
            try {
              await dismiss.mutateAsync(contactId);
              toast.success("Removed from Missed Meetings.");
            } catch (e: any) {
              toast.error(e.message || "Failed to remove");
            }
          }}
        >
          <X className="mr-2 h-4 w-4" />
          Remove from Missed Meetings
        </Button>
      )}
    </>
  );
}
