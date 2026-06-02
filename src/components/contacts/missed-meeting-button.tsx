"use client";

import { useMeetings } from "@/hooks/use-meetings";
import { useMarkMeetingMissed } from "@/hooks/use-followups";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { isPast } from "date-fns";
import { toast } from "sonner";

/**
 * Quick "Mark missed" action for a contact's most recent unresolved (past,
 * still-scheduled) meeting. Renders nothing if there's no such meeting.
 * Marking it sets status='no_show' and drops a dated no-show note.
 */
export function MissedMeetingButton({ contactId }: { contactId: string }) {
  const { data: meetings } = useMeetings({ contactId });
  const markMissed = useMarkMeetingMissed();

  const pastScheduled = (meetings ?? [])
    .filter((m) => m.status === "scheduled" && isPast(new Date(m.scheduled_at)))
    .sort(
      (a, b) =>
        new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()
    )[0];

  if (!pastScheduled) return null;

  return (
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
  );
}
