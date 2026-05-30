"use client";

import { useState } from "react";
import { Clock, X } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useSetFollowUp } from "@/hooks/use-followups";
import { formatDateForDB } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface FollowUpControlProps {
  contactId: string;
  currentFollowUp: string | null;
  /** Compact trigger for tight spaces (dialer). */
  size?: "sm" | "default";
  className?: string;
  /** Notified after a successful set/clear (date is null when cleared). */
  onChange?: (date: string | null) => void;
}

const PRESETS: { label: string; days?: number; months?: number }[] = [
  { label: "2 days", days: 2 },
  { label: "3 days", days: 3 },
  { label: "1 week", days: 7 },
  { label: "2 weeks", days: 14 },
  { label: "1 month", months: 1 },
];

function presetDate(p: { days?: number; months?: number }): string {
  const d = new Date();
  if (p.months) d.setMonth(d.getMonth() + p.months);
  if (p.days) d.setDate(d.getDate() + p.days);
  return formatDateForDB(d);
}

/** Parse a YYYY-MM-DD (or ISO) follow-up value as a local date for display. */
function parseLocal(value: string): Date {
  const datePart = value.split("T")[0];
  const [y, m, d] = datePart.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function FollowUpControl({
  contactId,
  currentFollowUp,
  size = "default",
  className,
  onChange,
}: FollowUpControlProps) {
  const [open, setOpen] = useState(false);
  const setFollowUp = useSetFollowUp();

  const apply = async (date: string | null) => {
    try {
      await setFollowUp.mutateAsync({ id: contactId, date });
      setOpen(false);
      onChange?.(date);
      toast.success(
        date
          ? `Follow-up set for ${format(parseLocal(date), "MMM d")}`
          : "Follow-up cleared"
      );
    } catch (e: any) {
      toast.error(e.message || "Failed to set follow-up");
    }
  };

  const label = currentFollowUp
    ? `Follow up ${format(parseLocal(currentFollowUp), "MMM d")}`
    : "Set follow-up";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={currentFollowUp ? "secondary" : "outline"}
          size={size === "sm" ? "sm" : "default"}
          className={cn("gap-2", className)}
        >
          <Clock className="h-4 w-4" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">Follow up in…</p>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                disabled={setFollowUp.isPending}
                onClick={() => apply(presetDate(p))}
                className="px-2.5 py-1 text-xs rounded-md border bg-muted/50 hover:bg-muted transition-colors disabled:opacity-50"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Or pick an exact date</p>
          <Input
            type="date"
            min={formatDateForDB(new Date())}
            defaultValue={currentFollowUp ? currentFollowUp.split("T")[0] : undefined}
            disabled={setFollowUp.isPending}
            onChange={(e) => {
              if (e.target.value) apply(e.target.value);
            }}
          />
        </div>

        {currentFollowUp && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full gap-2 text-muted-foreground"
            disabled={setFollowUp.isPending}
            onClick={() => apply(null)}
          >
            <X className="h-4 w-4" />
            Clear follow-up
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
