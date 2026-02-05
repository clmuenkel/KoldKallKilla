"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  AlertTriangle,
  Ban,
  PhoneOff,
  Clock,
  Loader2,
  Zap,
  Check,
  Users,
} from "lucide-react";
import type { 
  BloatStatus, 
  RemovalCandidate, 
  SuggestedAction,
  RemovalTier,
} from "@/lib/bloat-detector";

interface BloatFixDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bloatStatus: BloatStatus | null;
  onSuccess?: () => void;
}

const TIER_CONFIG: Record<RemovalTier, { 
  icon: typeof Ban; 
  label: string; 
  color: string;
  bgColor: string;
}> = {
  0: {
    icon: Ban,
    label: "Do Not Contact",
    color: "text-red-600",
    bgColor: "bg-red-500/10",
  },
  1: {
    icon: PhoneOff,
    label: "Not Interested",
    color: "text-orange-600",
    bgColor: "bg-orange-500/10",
  },
  2: {
    icon: Clock,
    label: "Unreachable",
    color: "text-amber-600",
    bgColor: "bg-amber-500/10",
  },
};

const ACTION_LABELS: Record<SuggestedAction, string> = {
  pause_12mo: "Pause 12mo",
  pause_6mo: "Pause 6mo",
  throttle_10d: "10-day cadence",
  throttle_14d: "14-day cadence",
};

export function BloatFixDialog({
  open,
  onOpenChange,
  bloatStatus,
  onSuccess,
}: BloatFixDialogProps) {
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<{
    tier0: RemovalCandidate[];
    tier1: RemovalCandidate[];
    tier2: RemovalCandidate[];
    total: number;
  } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [excludeAaa, setExcludeAaa] = useState(true);
  const [applying, setApplying] = useState(false);
  const [appliedCount, setAppliedCount] = useState(0);

  // Fetch candidates when dialog opens
  useEffect(() => {
    if (open && bloatStatus?.isBloated) {
      fetchCandidates();
    }
  }, [open, bloatStatus?.isBloated, excludeAaa]);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/dialer/bloat-fix?excludeAaa=${excludeAaa}&limit=100`
      );
      if (!response.ok) throw new Error("Failed to fetch candidates");
      const data = await response.json();
      setCandidates(data);
      
      // Auto-select all candidates up to overage amount
      const allCandidates = [
        ...data.tier0,
        ...data.tier1,
        ...data.tier2,
      ];
      const toSelect = new Set<string>();
      let count = 0;
      for (const c of allCandidates) {
        if (count >= (bloatStatus?.overage || 0)) break;
        toSelect.add(c.contactId);
        count++;
      }
      setSelected(toSelect);
    } catch (error) {
      console.error("Error fetching candidates:", error);
      toast.error("Failed to load removal candidates");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (contactId: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelected(newSelected);
  };

  const selectAll = (tier: RemovalTier) => {
    if (!candidates) return;
    const tierCandidates = 
      tier === 0 ? candidates.tier0 :
      tier === 1 ? candidates.tier1 :
      candidates.tier2;
    
    const newSelected = new Set(selected);
    for (const c of tierCandidates) {
      newSelected.add(c.contactId);
    }
    setSelected(newSelected);
  };

  const deselectAll = (tier: RemovalTier) => {
    if (!candidates) return;
    const tierCandidates = 
      tier === 0 ? candidates.tier0 :
      tier === 1 ? candidates.tier1 :
      candidates.tier2;
    
    const newSelected = new Set(selected);
    for (const c of tierCandidates) {
      newSelected.delete(c.contactId);
    }
    setSelected(newSelected);
  };

  const handleApply = async () => {
    if (!candidates || selected.size === 0) return;
    
    setApplying(true);
    setAppliedCount(0);
    
    try {
      // Build list of candidates with their actions
      const allCandidates = [
        ...candidates.tier0,
        ...candidates.tier1,
        ...candidates.tier2,
      ];
      
      const toApply = allCandidates
        .filter(c => selected.has(c.contactId))
        .map(c => ({
          contactId: c.contactId,
          action: c.suggestedAction,
        }));
      
      const response = await fetch("/api/dialer/bloat-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidates: toApply }),
      });
      
      if (!response.ok) throw new Error("Failed to apply fixes");
      
      const result = await response.json();
      setAppliedCount(result.applied);
      
      toast.success(`Fixed ${result.applied} contacts`);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error applying fixes:", error);
      toast.error("Failed to apply some fixes");
    } finally {
      setApplying(false);
    }
  };

  const handleAutoFix = async () => {
    setApplying(true);
    
    try {
      const response = await fetch("/api/dialer/bloat-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoFix: true }),
      });
      
      if (!response.ok) throw new Error("Failed to auto-fix");
      
      const result = await response.json();
      
      toast.success(
        `Auto-fixed ${result.applied} contacts: ${result.tier0} DNC, ${result.tier1} not interested, ${result.tier2} throttled`
      );
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error auto-fixing:", error);
      toast.error("Failed to auto-fix");
    } finally {
      setApplying(false);
    }
  };

  const renderCandidateTable = (tierCandidates: RemovalCandidate[], tier: RemovalTier) => {
    const config = TIER_CONFIG[tier];
    const Icon = config.icon;
    const selectedCount = tierCandidates.filter(c => selected.has(c.contactId)).length;
    
    if (tierCandidates.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Icon className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No candidates in this tier</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={config.bgColor}>
              {tierCandidates.length} contacts
            </Badge>
            <span className="text-sm text-muted-foreground">
              {selectedCount} selected
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => selectAll(tier)}
            >
              Select All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deselectAll(tier)}
            >
              Deselect All
            </Button>
          </div>
        </div>
        
        <ScrollArea className="h-[300px] border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Calls</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tierCandidates.map((candidate) => (
                <TableRow
                  key={candidate.contactId}
                  className={selected.has(candidate.contactId) ? "bg-primary/5" : ""}
                >
                  <TableCell>
                    <Checkbox
                      checked={selected.has(candidate.contactId)}
                      onCheckedChange={() => toggleSelect(candidate.contactId)}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{candidate.contactName}</p>
                      {candidate.companyName && (
                        <p className="text-xs text-muted-foreground">
                          {candidate.companyName}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{candidate.reason}</span>
                    {candidate.unreachableScore !== undefined && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Score: {candidate.unreachableScore}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{candidate.totalCalls}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        candidate.suggestedAction.startsWith("pause")
                          ? "bg-red-500/10 text-red-600"
                          : "bg-amber-500/10 text-amber-600"
                      }
                    >
                      {ACTION_LABELS[candidate.suggestedAction]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    );
  };

  if (!bloatStatus) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Dialer Queue Bloated
          </DialogTitle>
          <DialogDescription>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>
                  Due today: <strong className="text-red-600">{bloatStatus.dueToday}</strong>
                </span>
              </div>
              <div className="text-muted-foreground">|</div>
              <div>
                Target: <strong>{bloatStatus.target}</strong>
              </div>
              <div className="text-muted-foreground">|</div>
              <div>
                Overage: <strong className="text-amber-600">+{bloatStatus.overage}</strong>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between py-2 border-b">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={excludeAaa}
              onCheckedChange={(v) => setExcludeAaa(!!v)}
            />
            <span className="text-sm">Exclude AAA contacts from suggestions</span>
          </label>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleAutoFix}
            disabled={applying || loading}
          >
            <Zap className="h-4 w-4 mr-1" />
            Auto-Fix ({bloatStatus.overage})
          </Button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : candidates ? (
          <Tabs defaultValue="tier0" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="tier0" className="gap-2">
                <Ban className="h-4 w-4" />
                DNC ({candidates.tier0.length})
              </TabsTrigger>
              <TabsTrigger value="tier1" className="gap-2">
                <PhoneOff className="h-4 w-4" />
                Not Interested ({candidates.tier1.length})
              </TabsTrigger>
              <TabsTrigger value="tier2" className="gap-2">
                <Clock className="h-4 w-4" />
                Unreachable ({candidates.tier2.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="tier0" className="flex-1 overflow-auto mt-4">
              {renderCandidateTable(candidates.tier0, 0)}
            </TabsContent>
            <TabsContent value="tier1" className="flex-1 overflow-auto mt-4">
              {renderCandidateTable(candidates.tier1, 1)}
            </TabsContent>
            <TabsContent value="tier2" className="flex-1 overflow-auto mt-4">
              {renderCandidateTable(candidates.tier2, 2)}
            </TabsContent>
          </Tabs>
        ) : null}

        <DialogFooter className="border-t pt-4">
          <div className="flex items-center gap-4 w-full">
            <div className="text-sm text-muted-foreground">
              {selected.size} contacts selected
              {selected.size > 0 && bloatStatus.overage > 0 && (
                <span className="ml-2">
                  ({Math.round((selected.size / bloatStatus.overage) * 100)}% of overage)
                </span>
              )}
            </div>
            <div className="flex-1" />
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              disabled={applying || selected.size === 0}
            >
              {applying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Apply to {selected.size} Contacts
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Full capacity status from the API
 */
export interface CapacityStatus {
  bloat: BloatStatus;
  unscheduled: {
    total: number;
    overdue: number;
  };
  unreachableToday: {
    count: number;
    percentage: number;
  };
  today: {
    total: number;
    new: number;
    followUp: number;
    overdue: number;
  };
}

/**
 * Hook to check for bloat and return full capacity status
 */
export function useBloatStatus() {
  const [bloatStatus, setBloatStatus] = useState<BloatStatus | null>(null);
  const [capacityStatus, setCapacityStatus] = useState<CapacityStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const response = await fetch("/api/dialer/capacity");
      if (!response.ok) throw new Error("Failed to fetch capacity");
      const data = await response.json();
      setBloatStatus(data.bloat);
      setCapacityStatus({
        bloat: data.bloat,
        unscheduled: data.unscheduled || { total: 0, overdue: 0 },
        unreachableToday: data.unreachableToday || { count: 0, percentage: 0 },
        today: data.today,
      });
    } catch (error) {
      console.error("Error fetching bloat status:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return { bloatStatus, capacityStatus, loading, refresh };
}
