"use client";

import { useSetFollowUp } from "@/hooks/use-followups";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { toast } from "sonner";

/**
 * Explicit "Remove from Follow-ups" action — clears the contact's next_follow_up
 * so they drop out of the Follow-ups Due queue. Renders nothing if no follow-up
 * is set. Pass onRemoved to also prune them from an active dialer session.
 */
export function RemoveFollowUpButton({
  contactId,
  currentFollowUp,
  size = "default",
  onRemoved,
}: {
  contactId: string;
  currentFollowUp: string | null;
  size?: "sm" | "default";
  onRemoved?: () => void;
}) {
  const setFollowUp = useSetFollowUp();
  if (!currentFollowUp) return null;

  return (
    <Button
      variant="outline"
      size={size === "sm" ? "sm" : "default"}
      className="text-muted-foreground"
      disabled={setFollowUp.isPending}
      onClick={async () => {
        try {
          await setFollowUp.mutateAsync({ id: contactId, date: null });
          onRemoved?.();
          toast.success("Removed from Follow-ups");
        } catch (e: any) {
          toast.error(e.message || "Failed to remove");
        }
      }}
    >
      <X className="mr-2 h-4 w-4" />
      Remove from Follow-ups
    </Button>
  );
}
