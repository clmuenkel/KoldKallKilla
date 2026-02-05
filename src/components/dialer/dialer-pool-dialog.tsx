"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_USER_ID } from "@/lib/default-user";
import { useDialerStore } from "@/stores/dialer-store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, PauseCircle, PlayCircle, Calendar } from "lucide-react";

// Preset reasons for pausing
export const PAUSE_REASON_PRESETS = [
  { code: "not_interested", label: "Not interested at this time" },
  { code: "callback_later", label: "Asked to call back later" },
  { code: "company_freeze", label: "Company-wide decision" },
  { code: "bad_timing", label: "Bad timing / busy period" },
  { code: "other", label: "Other" },
] as const;

export type PauseReasonCode = typeof PAUSE_REASON_PRESETS[number]["code"];

// Sentinel date for "indefinite" pause - far future date that existing logic will treat as "still paused"
export const INDEFINITE_PAUSE_DATE = "2099-12-31";

// Helper to check if a pause is indefinite
export function isIndefinitePause(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  return dateStr === INDEFINITE_PAUSE_DATE || dateStr.startsWith("2099-");
}

// Duration options in months (-1 = indefinite)
export const PAUSE_DURATION_OPTIONS = [
  { months: 1, label: "1 month" },
  { months: 3, label: "3 months" },
  { months: 6, label: "6 months" },
  { months: 12, label: "1 year" },
  { months: -1, label: "Indefinitely (until I re-add)" },
] as const;

interface DialerPoolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: "company" | "contact";
  entityId: string;
  entityName: string;
  isPaused: boolean;
  pausedUntil?: string | null;
  onSuccess?: () => void;
}

export function DialerPoolDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
  entityName,
  isPaused,
  pausedUntil,
  onSuccess,
}: DialerPoolDialogProps) {
  const [durationMonths, setDurationMonths] = useState<number>(1);
  const [reasonCode, setReasonCode] = useState<PauseReasonCode>("not_interested");
  const [reasonNotes, setReasonNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const supabase = createClient();
  const queryClient = useQueryClient();
  const userId = DEFAULT_USER_ID;
  
  // Get dialer store actions for immediate queue updates
  const { removeContactFromQueue, removeCompanyContactsFromQueue } = useDialerStore();

  // Calculate pause until date
  const calculatePauseUntil = (months: number): string => {
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return date.toISOString().split("T")[0];
  };

  // Format date for display
  const formatPauseDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "";
    // Show "Indefinitely" for the sentinel date
    if (isIndefinitePause(dateStr)) return "Indefinitely";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const handlePause = async () => {
    setIsLoading(true);
    try {
      // Use sentinel date for indefinite pause, otherwise calculate from months
      const pauseUntilDate = durationMonths === -1 
        ? INDEFINITE_PAUSE_DATE 
        : calculatePauseUntil(durationMonths);
      const now = new Date().toISOString();

      if (entityType === "company") {
        // Update company pause fields
        const { error } = await supabase
          .from("companies")
          .update({
            dialer_paused_until: pauseUntilDate,
            dialer_pause_reason_code: reasonCode,
            dialer_pause_reason_notes: reasonNotes || null,
            dialer_paused_at: now,
          })
          .eq("id", entityId);

        if (error) throw error;
      } else {
        // Update contact pause fields
        const { error } = await supabase
          .from("contacts")
          .update({
            dialer_status: "paused",
            dialer_paused_until: pauseUntilDate,
            dialer_pause_reason_code: reasonCode,
            dialer_pause_reason_notes: reasonNotes || null,
            dialer_paused_at: now,
          })
          .eq("id", entityId);

        if (error) throw error;
      }

      // Log the event (use null for duration_months when indefinite)
      await supabase.from("dialer_pool_events").insert({
        user_id: userId,
        entity_type: entityType,
        company_id: entityType === "company" ? entityId : null,
        contact_id: entityType === "contact" ? entityId : null,
        entity_name: entityName,
        action: "paused",
        paused_until: pauseUntilDate,
        duration_months: durationMonths === -1 ? null : durationMonths,
        reason_code: reasonCode,
        reason_notes: reasonNotes || null,
      });

      // Immediately remove from active dialer session queue
      if (entityType === "company") {
        removeCompanyContactsFromQueue(entityId);
      } else {
        removeContactFromQueue(entityId);
      }

      // Invalidate queries so dialer lists refresh with updated pause status
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });

      const displayDate = durationMonths === -1 ? "indefinitely" : formatPauseDate(pauseUntilDate);
      toast.success(`${entityType === "company" ? "Company" : "Contact"} removed from dialer pool ${durationMonths === -1 ? "indefinitely" : `until ${displayDate}`}`);
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Failed to pause:", error);
      toast.error(error.message || "Failed to remove from dialer pool");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnpause = async () => {
    setIsLoading(true);
    try {
      if (entityType === "company") {
        // Clear company pause fields
        const { error } = await supabase
          .from("companies")
          .update({
            dialer_paused_until: null,
            dialer_pause_reason_code: null,
            dialer_pause_reason_notes: null,
            dialer_paused_at: null,
          })
          .eq("id", entityId);

        if (error) throw error;
      } else {
        // Clear contact pause fields and set status back to active
        const { error } = await supabase
          .from("contacts")
          .update({
            dialer_status: "active",
            dialer_paused_until: null,
            dialer_pause_reason_code: null,
            dialer_pause_reason_notes: null,
            dialer_paused_at: null,
          })
          .eq("id", entityId);

        if (error) throw error;
      }

      // Log the event
      await supabase.from("dialer_pool_events").insert({
        user_id: userId,
        entity_type: entityType,
        company_id: entityType === "company" ? entityId : null,
        contact_id: entityType === "contact" ? entityId : null,
        entity_name: entityName,
        action: "unpaused",
      });

      // Invalidate queries so dialer lists refresh with updated pause status
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });

      toast.success(`${entityType === "company" ? "Company" : "Contact"} re-added to dialer pool`);
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Failed to unpause:", error);
      toast.error(error.message || "Failed to re-add to dialer pool");
    } finally {
      setIsLoading(false);
    }
  };

  // Reset form when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setDurationMonths(1);
      setReasonCode("not_interested");
      setReasonNotes("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isPaused ? (
              <>
                <PlayCircle className="h-5 w-5 text-emerald-500" />
                Re-add to Dialer Pool
              </>
            ) : (
              <>
                <PauseCircle className="h-5 w-5 text-amber-500" />
                Remove from Dialer Pool
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isPaused ? (
              <>
                <span className="font-medium">{entityName}</span> is currently paused until{" "}
                <Badge variant="secondary" className="ml-1">
                  {formatPauseDate(pausedUntil)}
                </Badge>
              </>
            ) : (
              <>
                Remove <span className="font-medium">{entityName}</span> from the dialer queue.
                {entityType === "company" && " All contacts from this company will be excluded."}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {isPaused ? (
          // Unpause confirmation
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              This will make {entityType === "company" ? "all contacts from this company" : "this contact"} eligible for the dialer queue again
              (subject to individual contact status and cadence rules).
            </p>
          </div>
        ) : (
          // Pause form
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Select
                value={durationMonths.toString()}
                onValueChange={(v) => setDurationMonths(parseInt(v))}
              >
                <SelectTrigger id="duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAUSE_DURATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.months} value={opt.months.toString()}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {durationMonths === -1 
                  ? "Will be paused until you re-add them to the pool"
                  : `Will be paused until ${formatPauseDate(calculatePauseUntil(durationMonths))}`
                }
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Select
                value={reasonCode}
                onValueChange={(v) => setReasonCode(v as PauseReasonCode)}
              >
                <SelectTrigger id="reason">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAUSE_REASON_PRESETS.map((preset) => (
                    <SelectItem key={preset.code} value={preset.code}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any additional context..."
                value={reasonNotes}
                onChange={(e) => setReasonNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          {isPaused ? (
            <Button onClick={handleUnpause} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Re-add to Pool
            </Button>
          ) : (
            <Button onClick={handlePause} disabled={isLoading} variant="destructive">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove from Pool
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper to check if a company/contact is currently paused
export function isEntityPaused(pausedUntil: string | null | undefined): boolean {
  if (!pausedUntil) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const pauseDate = new Date(pausedUntil);
  return pauseDate > today;
}
