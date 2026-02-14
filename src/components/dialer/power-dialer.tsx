"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useDialerStore } from "@/stores/dialer-store";
import { useCallTimer } from "@/hooks/use-call-timer";
import { useContacts } from "@/hooks/use-contacts";
import { useCompanyColleagues, useCompanies } from "@/hooks/use-companies";
import { useDialerAutosave, useHydrateDraft } from "@/hooks/use-dialer-autosave";
import { useDialerShortcuts, useShortcutsHelp, DIALER_SHORTCUTS } from "@/hooks/use-keyboard-shortcuts";
import { useLogCall, useContactsCalledToday } from "@/hooks/use-calls";
import { useCreateSession, usePauseSession, useResumeSession } from "@/hooks/use-sessions";
import { useUpdateContact } from "@/hooks/use-contacts";
import { CallQueue } from "./call-queue";
import { ContactPanelCompact } from "./contact-panel";
import { CallControlsHeader } from "./call-controls";
import { NotesAndTasks } from "./notes-and-tasks";
import { BloatFixDialog, useBloatStatus } from "./bloat-fix-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STAGES } from "@/lib/constants";
import { cn, isDueOrNew, isPauseExpired } from "@/lib/utils";
import { 
  getContactTimezone, 
  getTimezoneGroup, 
  getBusinessHourStatus,
  getTimezoneGroupLabel,
  getLocalTimeShort,
  TIMEZONE_GROUPS,
  type TimezoneGroup,
  type BusinessHourStatus,
} from "@/lib/timezone";
import { 
  Phone, 
  Zap, 
  Users, 
  Save, 
  Filter, 
  Building2,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Keyboard,
  X,
  Clock,
  PhoneOff,
  Loader2,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_USER_ID } from "@/lib/default-user";
import type { Contact } from "@/types/database";

type FilterMode = "stage" | "company" | "all";

// Keyboard Shortcuts Help Panel
function ShortcutsHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-md mx-4 shadow-2xl">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              Keyboard Shortcuts
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Use these shortcuts for faster dialing
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-2">
            {DIALER_SHORTCUTS.map((shortcut) => (
              <div
                key={shortcut.key}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
              >
                <span className="text-sm text-muted-foreground">{shortcut.description}</span>
                <kbd className="px-2 py-1 bg-background rounded border text-xs font-mono font-semibold">
                  {shortcut.key}
                </kbd>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">?</kbd> to toggle this menu
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function PowerDialer() {
  const userId = DEFAULT_USER_ID;
  const notesInputRef = useRef<HTMLTextAreaElement>(null);
  
  // Session setup state
  const [filterMode, setFilterMode] = useState<FilterMode>("stage");
  const [selectedStages, setSelectedStages] = useState<string[]>(["fresh"]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [requirePhone, setRequirePhone] = useState(true);
  const [enableCadence, setEnableCadence] = useState(true); // Cadence filtering enabled by default
  const [selectedTimezones, setSelectedTimezones] = useState<string[]>(["all"]); // "all" or specific timezone groups

  const {
    isActive,
    isViewingHome,
    queue,
    currentContact,
    currentIndex,
    isCallActive,
    callDuration,
    timestampedNotes,
    notes,
    outcome,
    disposition,
    confirmedBudget,
    confirmedAuthority,
    confirmedNeed,
    confirmedTimeline,
    selectedPhoneType,
    sessionDbId,
    getSelectedPhone,
    setOutcome,
    startSession,
    startCall,
    endCall,
    nextContact,
    previousContact,
    skipContact,
    addTimestampedNote,
    updateTimestampedNote,
    deleteTimestampedNote,
    goToContact,
    pruneQueue,
  } = useDialerStore();
  
  const logCall = useLogCall();
  const updateContact = useUpdateContact();
  
  // Session management hooks
  const createSession = useCreateSession();
  const pauseSessionDb = usePauseSession();
  const resumeSessionDb = useResumeSession();
  
  // Same-day recall prevention - contacts called today are filtered out
  const { data: contactsCalledToday, isLoading: loadingCalledToday } = useContactsCalledToday();
  
  // Keyboard shortcuts help
  const { showHelp, setShowHelp } = useShortcutsHelp();

  // Fetch only in-pool contacts so dialer counts and queue match "In pool" on contacts page
  const { data: allContacts, isLoading: loadingContacts } = useContacts({ dialerPool: "in_pool" });
  
  // Fetch companies for company filter
  const { data: companies, isLoading: loadingCompanies } = useCompanies({});

  // Compute set of paused company IDs (companies removed from dialer pool)
  const pausedCompanyIds = useMemo(() => {
    if (!companies) return new Set<string>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Set(
      companies
        .filter(c => {
          if (!c.dialer_paused_until) return false;
          const pauseDate = new Date(c.dialer_paused_until);
          return pauseDate > today; // Still paused
        })
        .map(c => c.id)
    );
  }, [companies]);

  // Build a map of company ID -> company for timezone lookups
  const companiesById = useMemo(() => {
    if (!companies) return new Map<string, { timezone?: string | null }>();
    return new Map(companies.map(c => [c.id, { timezone: c.timezone }]));
  }, [companies]);

  // Re-apply pause filters to active queue when pause status changes
  // This ensures "Remove from Dialer Pool" takes immediate effect
  useEffect(() => {
    if (queue.length === 0) return;
    
    // Build a set of paused contact IDs from allContacts data
    const pausedContactIds = new Set<string>();
    if (allContacts) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      for (const c of allContacts) {
        if (c.dialer_status === "paused" && c.dialer_paused_until) {
          const pauseDate = new Date(c.dialer_paused_until);
          if (pauseDate > today) {
            pausedContactIds.add(c.id);
          }
        }
      }
    }
    
    // Prune contacts that are now paused (either directly or via company)
    pruneQueue((contact) => {
      // Contact is directly paused
      if (pausedContactIds.has(contact.id)) {
        return true;
      }
      // Contact's company is paused
      if (contact.company_id && pausedCompanyIds.has(contact.company_id)) {
        return true;
      }
      return false;
    });
  }, [pausedCompanyIds, allContacts, queue.length, pruneQueue]);

  const { data: colleagues } = useCompanyColleagues(
    currentContact?.id || "",
    currentContact?.company_id
  );

  // Bloat detection and capacity status
  const { bloatStatus, capacityStatus, refresh: refreshBloatStatus } = useBloatStatus();
  const [showBloatDialog, setShowBloatDialog] = useState(false);
  const [isBackfilling, setIsBackfilling] = useState(false);

  // Initialize call timer
  useCallTimer();

  // Autosave dialer state (debounced)
  const { isSaving } = useDialerAutosave(userId);
  
  // Hydrate from saved draft when switching contacts
  useHydrateDraft(userId);
  
  // Keyboard shortcut handlers
  const selectedPhone = getSelectedPhone();
  
  const handleDial = useCallback(() => {
    if (!selectedPhone) {
      toast.error("No phone number available");
      return;
    }
    const cleanNumber = selectedPhone.replace(/\D/g, "");
    window.open(
      `https://voice.google.com/u/0/calls?a=nc,${cleanNumber}`,
      "googleVoice",
      "width=400,height=600,left=100,top=100"
    );
    startCall();
    toast.success(`Calling ${selectedPhoneType === "mobile" ? "mobile" : "office"}! Timer started.`);
  }, [selectedPhone, selectedPhoneType, startCall]);

  const handleEndCall = useCallback(() => {
    endCall();
    toast.info("Call ended. Select an outcome (1-5).");
  }, [endCall]);

  const handleSkip = useCallback(async () => {
    if (!currentContact) {
      skipContact();
      return;
    }
    try {
      await logCall.mutateAsync({
        call: {
          user_id: userId,
          contact_id: currentContact.id,
          company_id: currentContact.company_id || null,
          session_id: sessionDbId || undefined,
          started_at: new Date().toISOString(),
          ended_at: new Date().toISOString(),
          duration_seconds: 0,
          outcome: "skipped",
          phone_used: selectedPhoneType,
        },
      });
      toast.info("Contact skipped");
      nextContact();
    } catch (error) {
      console.error("Failed to log skip:", error);
      skipContact();
    }
  }, [currentContact, userId, selectedPhoneType, sessionDbId, logCall, nextContact, skipContact]);

  const handleSaveAndNext = useCallback(async () => {
    if (!currentContact || !outcome) {
      if (!outcome) toast.error("Select an outcome (1-5)");
      return;
    }
    try {
      await logCall.mutateAsync({
        call: {
          user_id: userId,
          contact_id: currentContact.id,
          company_id: currentContact.company_id || null,
          session_id: sessionDbId || undefined,
          started_at: new Date(Date.now() - callDuration * 1000).toISOString(),
          ended_at: new Date().toISOString(),
          duration_seconds: callDuration,
          outcome,
          disposition: disposition || undefined,
          phone_used: selectedPhoneType,
          notes: notes || undefined,
          confirmed_budget: confirmedBudget,
          confirmed_authority: confirmedAuthority,
          confirmed_need: confirmedNeed,
          confirmed_timeline: confirmedTimeline,
          timestamped_notes: timestampedNotes.length > 0 ? timestampedNotes : undefined,
        },
      });
      const positiveDisposition = disposition === "meeting" || disposition === "interested_follow_up" || disposition?.includes("interested");
      const newStage =
        outcome === "connected" && positiveDisposition
          ? "qualified"
          : (currentContact.stage === "fresh" || !currentContact.stage ? "contacted" : currentContact.stage);
      await updateContact.mutateAsync({
        id: currentContact.id,
        updates: {
          has_budget: confirmedBudget,
          is_authority: confirmedAuthority,
          has_need: confirmedNeed,
          has_timeline: confirmedTimeline,
          stage: newStage,
        },
      });
      toast.success("Call saved!");
      nextContact();
    } catch (error: any) {
      toast.error(error.message || "Failed to save call");
    }
  }, [currentContact, outcome, disposition, callDuration, notes, selectedPhoneType, sessionDbId, confirmedBudget, confirmedAuthority, confirmedNeed, confirmedTimeline, timestampedNotes, userId, logCall, updateContact, nextContact]);

  const handleFocusNotes = useCallback(() => {
    // Focus the notes input in NotesAndTasks
    const notesInput = document.querySelector('textarea[placeholder*="Add note"]') as HTMLTextAreaElement;
    if (notesInput) {
      notesInput.focus();
    }
  }, []);

  // Handle backfill of unscheduled contacts
  const handleBackfill = useCallback(async () => {
    setIsBackfilling(true);
    try {
      const response = await fetch("/api/dialer/backfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ includeOverdue: true }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to run backfill");
      }
      
      const result = await response.json();
      toast.success(`Distributed ${result.scheduled} contacts across ${result.distribution.length} business days`);
      refreshBloatStatus();
    } catch (error: any) {
      console.error("Backfill error:", error);
      toast.error(error.message || "Failed to distribute contacts");
    } finally {
      setIsBackfilling(false);
    }
  }, [refreshBloatStatus]);

  const handleOutcome = useCallback((newOutcome: string) => {
    setOutcome(newOutcome);
    
    if (newOutcome === "connected") {
      // Open pickup disposition popup for connected calls
      useDialerStore.getState().openPickupDialog();
    } else {
      toast.success(`Outcome: ${newOutcome.replace("_", " ")}`);
    }
  }, [setOutcome]);

  // Wire up keyboard shortcuts (only when session is active)
  useDialerShortcuts({
    onDial: handleDial,
    onEndCall: handleEndCall,
    onSkip: handleSkip,
    onSaveAndNext: handleSaveAndNext,
    onFocusNotes: handleFocusNotes,
    onOutcome: handleOutcome,
    onPrevious: previousContact,
    onNext: nextContact,
    isCallActive,
    canSave: !!outcome,
  });

  // Calculate counts per stage
  const stageCounts = STAGES.reduce((acc, stage) => {
    const stageContacts = allContacts?.filter(c => c.stage === stage.value) || [];
    acc[stage.value] = {
      total: stageContacts.length,
      withPhone: stageContacts.filter(c => c.phone || c.mobile).length,
    };
    return acc;
  }, {} as Record<string, { total: number; withPhone: number }>);

  // Calculate counts per timezone group (based on pre-filtered contacts for accurate counts)
  const getTimezoneCountsForFilteredContacts = () => {
    if (!allContacts) return {} as Record<TimezoneGroup, { count: number; status: BusinessHourStatus }>;
    
    // Apply base filters first (same as getFilteredContacts but without timezone filter)
    let baseFiltered = allContacts;
    
    if (filterMode === "stage") {
      baseFiltered = baseFiltered.filter(c => selectedStages.includes(c.stage || "fresh"));
    } else if (filterMode === "company" && selectedCompanyId) {
      baseFiltered = baseFiltered.filter(c => c.company_id === selectedCompanyId);
    }
    
    if (requirePhone) {
      baseFiltered = baseFiltered.filter(c => c.phone || c.mobile);
    }
    
    // Count contacts per timezone group
    const counts = TIMEZONE_GROUPS.reduce((acc, group) => {
      const groupContacts = baseFiltered.filter(c => {
        const company = c.company_id ? companiesById.get(c.company_id) : null;
        const tz = getContactTimezone(c, company);
        return getTimezoneGroup(tz) === group;
      });
      
      // Get status for this timezone group (use first contact's timezone as representative)
      const representativeTz = group !== "unknown" 
        ? getRepresentativeTimezone(group)
        : null;
      
      acc[group] = {
        count: groupContacts.length,
        status: getBusinessHourStatus(representativeTz),
      };
      return acc;
    }, {} as Record<TimezoneGroup, { count: number; status: BusinessHourStatus }>);
    
    return counts;
  };
  
  // Get a representative timezone for a group (for business hours display)
  const getRepresentativeTimezone = (group: TimezoneGroup): string | null => {
    switch (group) {
      case "pacific": return "America/Los_Angeles";
      case "mountain": return "America/Denver";
      case "central": return "America/Chicago";
      case "eastern": return "America/New_York";
      case "alaska": return "America/Anchorage";
      case "hawaii": return "America/Honolulu";
      default: return null;
    }
  };
  
  const timezoneCounts = getTimezoneCountsForFilteredContacts();

  // Maximum call attempts before contact is exhausted
  const MAX_CALL_ATTEMPTS = 10;

  // Get filtered contacts based on current selection
  const getFilteredContacts = (): Contact[] => {
    if (!allContacts) return [];
    
    let filtered = allContacts;
    
    // HARD FILTER: Same-day recall prevention
    // Contacts called today are never served again today, regardless of cadence mode
    if (contactsCalledToday && contactsCalledToday.size > 0) {
      filtered = filtered.filter(c => !contactsCalledToday.has(c.id));
    }
    
    // Apply base filters (stage, company, all)
    if (filterMode === "stage") {
      filtered = filtered.filter(c => selectedStages.includes(c.stage || "fresh"));
    } else if (filterMode === "company" && selectedCompanyId) {
      filtered = filtered.filter(c => c.company_id === selectedCompanyId);
    }
    
    // Require phone number
    if (requirePhone) {
      filtered = filtered.filter(c => c.phone || c.mobile);
    }

    // Apply timezone filtering (unless "all" is selected)
    if (!selectedTimezones.includes("all")) {
      filtered = filtered.filter(c => {
        const company = c.company_id ? companiesById.get(c.company_id) : null;
        const tz = getContactTimezone(c, company);
        const group = getTimezoneGroup(tz);
        return selectedTimezones.includes(group);
      });
    }

    // ALWAYS exclude contacts that are not eligible for dialing (regardless of cadence toggle)
    // This includes: paused, exhausted, converted, max attempts reached, and company-paused
    filtered = filtered.filter(c => {
      // Skip exhausted contacts (max attempts reached status)
      if (c.dialer_status === "exhausted" || c.dialer_status === "converted") {
        return false;
      }
      
      // Skip contacts with too many attempts
      if ((c.total_calls || 0) >= MAX_CALL_ATTEMPTS) {
        return false;
      }
      
      // Skip paused contacts (unless pause period has expired)
      if (c.dialer_status === "paused") {
        if (!isPauseExpired(c.dialer_paused_until)) {
          return false; // Still paused
        }
      }
      
      // Skip contacts whose company is paused
      if (c.company_id && pausedCompanyIds.has(c.company_id)) {
        return false;
      }
      
      return true;
    });

    // Apply cadence-based due date filtering ONLY when cadence is enabled
    if (enableCadence) {
      filtered = filtered.filter(c => {
        // Check if contact is due for a call (null = never called, always due)
        return isDueOrNew(c.next_call_date);
      });

      // Sort: AAA first, then due contacts, then new contacts
      filtered.sort((a, b) => {
        // AAA contacts always first
        if (a.is_aaa && !b.is_aaa) return -1;
        if (!a.is_aaa && b.is_aaa) return 1;
        
        // Contacts with a due date come before contacts never called
        if (a.next_call_date && !b.next_call_date) return -1;
        if (!a.next_call_date && b.next_call_date) return 1;
        
        // If both have dates, sort by date (earlier first)
        if (a.next_call_date && b.next_call_date) {
          return new Date(a.next_call_date).getTime() - new Date(b.next_call_date).getTime();
        }
        
        // Both null - maintain original order
        return 0;
      });
    } else {
      // Even without cadence, sort AAA contacts first
      filtered.sort((a, b) => {
        if (a.is_aaa && !b.is_aaa) return -1;
        if (!a.is_aaa && b.is_aaa) return 1;
        return 0;
      });
    }
    
    return filtered;
  };

  const filteredContacts = getFilteredContacts();
  const contactsReadyToCall = filteredContacts.length;

  const handleStageToggle = (stageValue: string) => {
    setSelectedStages(prev => {
      if (prev.includes(stageValue)) {
        // Don't allow deselecting all stages
        if (prev.length === 1) return prev;
        return prev.filter(s => s !== stageValue);
      }
      return [...prev, stageValue];
    });
  };

  const handleTimezoneToggle = (timezone: string) => {
    setSelectedTimezones(prev => {
      // If clicking "all", select only "all"
      if (timezone === "all") {
        return ["all"];
      }
      
      // If "all" was selected, switch to just this timezone
      if (prev.includes("all")) {
        return [timezone];
      }
      
      // Toggle the timezone
      if (prev.includes(timezone)) {
        // Don't allow deselecting all timezones - switch to "all"
        if (prev.length === 1) return ["all"];
        return prev.filter(t => t !== timezone);
      }
      
      // Check if selecting this timezone means all are selected
      const newSelection = [...prev, timezone];
      const allGroups = TIMEZONE_GROUPS;
      if (allGroups.every(g => newSelection.includes(g))) {
        return ["all"]; // All selected, switch to "all"
      }
      
      return newSelection;
    });
  };

  const handleStartSession = async () => {
    if (filteredContacts.length === 0) {
      toast.error("No contacts match your filters. Adjust your selection.");
      return;
    }
    
    try {
      // Create explicit database session first
      const session = await createSession.mutateAsync({
        started_at: new Date().toISOString(),
        total_calls: 0,
        connected_calls: 0,
        meetings_booked: 0,
        voicemails: 0,
        skipped: 0,
        no_answers: 0,
        gatekeepers: 0,
        wrong_numbers: 0,
        ai_screener: 0,
        total_talk_time_seconds: 0,
      });
      
      // Start session in store with the database session ID
      startSession(filteredContacts, session.id);
      toast.success(`Starting session with ${filteredContacts.length} contacts`);
    } catch (error) {
      console.error("Failed to create session:", error);
      // Fall back to starting session without database tracking
      startSession(filteredContacts);
      toast.success(`Starting session with ${filteredContacts.length} contacts`);
    }
  };

  const isLoading = loadingContacts || loadingCompanies || loadingCalledToday;

  if (isLoading) {
    return (
      <div className="h-full p-6 space-y-4">
        <Skeleton className="h-14 w-full" />
        <div className="flex gap-4 h-[calc(100%-5rem)]">
          <Skeleton className="w-64 h-full" />
          <Skeleton className="flex-1 h-full" />
          <Skeleton className="w-80 h-full" />
        </div>
      </div>
    );
  }

  // Session Setup Screen (also shows when session is paused)
  if (!isActive || isViewingHome) {
    return (
      <div className="h-full overflow-auto bg-gradient-to-br from-background to-muted/30">
        <div className="max-w-3xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 ring-8 ring-primary/5">
              <Phone className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-2 tracking-tight">Power Dialer</h1>
            <p className="text-muted-foreground text-lg">
              {isActive && isViewingHome 
                ? "Session paused — resume or start a new one"
                : "Configure your calling session"}
            </p>
          </div>

          {/* Capacity Status */}
          {bloatStatus && (
            <div className="mb-6">
              {bloatStatus.isBloated ? (
                <Card className="border-amber-500/50 bg-amber-500/10">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20">
                          <AlertTriangle className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-medium text-amber-700 dark:text-amber-400">
                            Queue Bloated: {bloatStatus.dueToday} due today
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Target: {bloatStatus.target} · Overage: +{bloatStatus.overage}
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        className="border-amber-500/50 text-amber-700 hover:bg-amber-500/10"
                        onClick={() => setShowBloatDialog(true)}
                      >
                        Fix Bloat
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-green-500/30 bg-green-500/5">
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-muted-foreground">Due today:</span>
                        <span className={cn(
                          "font-semibold",
                          bloatStatus.dueToday > bloatStatus.target * 0.9 
                            ? "text-amber-600" 
                            : "text-green-600"
                        )}>
                          {bloatStatus.dueToday}
                        </span>
                        <span className="text-muted-foreground">/ {bloatStatus.target}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>New: {bloatStatus.newCount}</span>
                        <span>Follow-ups: {bloatStatus.followUpCount}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Backfill Unscheduled Contacts Card */}
          {capacityStatus && capacityStatus.unscheduled.total > 0 && (
            <Card className="mb-6 border-blue-500/30 bg-blue-500/5">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20">
                      <Calendar className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-blue-700 dark:text-blue-400">
                        {capacityStatus.unscheduled.total} contacts not scheduled
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Distribute across business days to maintain ~600/day
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    className="border-blue-500/50 text-blue-700 hover:bg-blue-500/10"
                    onClick={handleBackfill}
                    disabled={isBackfilling}
                  >
                    {isBackfilling ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Distributing...
                      </>
                    ) : (
                      "Distribute to Cadence"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Unreachable Contacts Recommendation Card */}
          {capacityStatus && capacityStatus.unreachableToday.percentage > 20 && (
            <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20">
                      <PhoneOff className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-medium text-amber-700 dark:text-amber-400">
                        {capacityStatus.unreachableToday.count} unreachable contacts due today
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Consider throttling or removing contacts with 6+ failed attempts
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    className="border-amber-500/50 text-amber-700 hover:bg-amber-500/10"
                    onClick={() => setShowBloatDialog(true)}
                  >
                    Review
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filter Options */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Select Contacts to Call
              </CardTitle>
              <CardDescription>
                Choose which contacts to include in this session
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Filter Mode Selection */}
              <RadioGroup
                value={filterMode}
                onValueChange={(v) => setFilterMode(v as FilterMode)}
                className="grid grid-cols-3 gap-3"
              >
                <Label
                  htmlFor="filter-stage"
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all",
                    filterMode === "stage" 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <RadioGroupItem value="stage" id="filter-stage" className="sr-only" />
                  <Users className="h-6 w-6" />
                  <span className="font-medium">By Stage</span>
                  <span className="text-xs text-muted-foreground text-center">
                    Filter by pipeline stage
                  </span>
                </Label>

                <Label
                  htmlFor="filter-company"
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all",
                    filterMode === "company" 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <RadioGroupItem value="company" id="filter-company" className="sr-only" />
                  <Building2 className="h-6 w-6" />
                  <span className="font-medium">By Company</span>
                  <span className="text-xs text-muted-foreground text-center">
                    Call all contacts at one company
                  </span>
                </Label>

                <Label
                  htmlFor="filter-all"
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all",
                    filterMode === "all" 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <RadioGroupItem value="all" id="filter-all" className="sr-only" />
                  <Zap className="h-6 w-6" />
                  <span className="font-medium">All Contacts</span>
                  <span className="text-xs text-muted-foreground text-center">
                    Include everyone
                  </span>
                </Label>
              </RadioGroup>

              {/* Stage Selection (when filter mode is "stage") */}
              {filterMode === "stage" && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Select Stages</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {STAGES.map((stage) => {
                      const count = stageCounts[stage.value];
                      const isSelected = selectedStages.includes(stage.value);
                      return (
                        <button
                          key={stage.value}
                          onClick={() => handleStageToggle(stage.value)}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg border transition-all text-left",
                            isSelected 
                              ? "border-primary bg-primary/5" 
                              : "border-border hover:border-primary/30"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn("h-3 w-3 rounded-full", stage.color)} />
                            <span className="font-medium">{stage.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {requirePhone ? count?.withPhone : count?.total} 
                            </Badge>
                            {isSelected && (
                              <CheckCircle2 className="h-4 w-4 text-primary" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Company Selection (when filter mode is "company") */}
              {filterMode === "company" && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Select Company</Label>
                  <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a company" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies?.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span>{company.name}</span>
                            <Badge variant="secondary" className="text-xs ml-2">
                              {company.contact_count} contacts
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!selectedCompanyId && (
                    <p className="text-sm text-muted-foreground">
                      Select a company to see its contacts
                    </p>
                  )}
                </div>
              )}

              {/* Require Phone Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">Only contacts with phone numbers</p>
                    <p className="text-xs text-muted-foreground">
                      Skip contacts without callable numbers
                    </p>
                  </div>
                </div>
                <Checkbox
                  checked={requirePhone}
                  onCheckedChange={(checked) => setRequirePhone(!!checked)}
                />
              </div>

              {/* Cadence Filtering Toggle */}
              <div className={cn(
                "flex items-center justify-between p-3 rounded-lg border transition-all",
                enableCadence 
                  ? "bg-emerald-500/5 border-emerald-500/30" 
                  : "bg-muted/30"
              )}>
                <div className="flex items-center gap-3">
                  <Zap className={cn(
                    "h-5 w-5",
                    enableCadence ? "text-emerald-500" : "text-muted-foreground"
                  )} />
                  <div>
                    <p className="font-medium text-sm">Enable Cadence Scheduling</p>
                    <p className="text-xs text-muted-foreground">
                      Only show contacts due for a call today (2-3 business days between calls)
                    </p>
                  </div>
                </div>
                <Checkbox
                  checked={enableCadence}
                  onCheckedChange={(checked) => setEnableCadence(!!checked)}
                />
              </div>

              {/* Timezone Filter */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Filter by Timezone</Label>
                  <span className="text-xs text-muted-foreground">
                    {selectedTimezones.includes("all") ? "All timezones" : `${selectedTimezones.length} selected`}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {/* All button */}
                  <button
                    onClick={() => handleTimezoneToggle("all")}
                    className={cn(
                      "px-3 py-1.5 text-sm rounded-lg border transition-all flex items-center gap-2",
                      selectedTimezones.includes("all")
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/50 hover:bg-muted border-transparent"
                    )}
                  >
                    All
                  </button>
                  
                  {/* Timezone group buttons */}
                  {TIMEZONE_GROUPS.filter(g => g !== "unknown").map((group) => {
                    const { count, status } = timezoneCounts[group] || { count: 0, status: "bad" as BusinessHourStatus };
                    const isSelected = selectedTimezones.includes(group) || selectedTimezones.includes("all");
                    const tzLabel = getTimezoneGroupLabel(group);
                    const localTime = getLocalTimeShort(getRepresentativeTimezone(group));
                    
                    return (
                      <button
                        key={group}
                        onClick={() => handleTimezoneToggle(group)}
                        disabled={count === 0}
                        className={cn(
                          "px-3 py-1.5 text-sm rounded-lg border transition-all flex items-center gap-2",
                          isSelected && !selectedTimezones.includes("all")
                            ? "bg-primary text-primary-foreground border-primary"
                            : selectedTimezones.includes("all")
                            ? "bg-muted/70 border-muted-foreground/20"
                            : "bg-muted/50 hover:bg-muted border-transparent",
                          count === 0 && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <span className={cn(
                          "h-2 w-2 rounded-full shrink-0",
                          status === "good" && "bg-emerald-500",
                          status === "borderline" && "bg-amber-500",
                          status === "bad" && "bg-red-500"
                        )} />
                        <span>{tzLabel}</span>
                        <span className="text-xs opacity-70">{localTime}</span>
                        <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                          {count}
                        </Badge>
                      </button>
                    );
                  })}
                  
                  {/* Unknown timezone button */}
                  {(timezoneCounts.unknown?.count || 0) > 0 && (
                    <button
                      onClick={() => handleTimezoneToggle("unknown")}
                      className={cn(
                        "px-3 py-1.5 text-sm rounded-lg border transition-all flex items-center gap-2",
                        selectedTimezones.includes("unknown") && !selectedTimezones.includes("all")
                          ? "bg-primary text-primary-foreground border-primary"
                          : selectedTimezones.includes("all")
                          ? "bg-muted/70 border-muted-foreground/20"
                          : "bg-muted/50 hover:bg-muted border-transparent"
                      )}
                    >
                      <span className="h-2 w-2 rounded-full shrink-0 bg-muted-foreground/50" />
                      <span>Unknown</span>
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                        {timezoneCounts.unknown?.count || 0}
                      </Badge>
                    </button>
                  )}
                </div>
                
                {/* Business hours legend */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>Good time (9am-5pm)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    <span>Borderline (8-9am, 5-6pm)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    <span>Outside hours</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Session Preview & Start */}
          <Card className={cn(
            "transition-all",
            contactsReadyToCall > 0 
              ? "border-primary/50 bg-primary/5" 
              : "border-amber-500/50 bg-amber-500/5"
          )}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {contactsReadyToCall > 0 ? (
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <AlertCircle className="h-6 w-6 text-amber-500" />
                    </div>
                  )}
                  <div>
                    <p className="text-2xl font-bold">
                      {contactsReadyToCall} contacts
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {contactsReadyToCall > 0 
                        ? "Ready to call with your current filters"
                        : "No contacts match your filters. Adjust your selection."}
                    </p>
                  </div>
                </div>

                <Button 
                  size="lg" 
                  onClick={handleStartSession}
                  disabled={contactsReadyToCall === 0}
                  className="h-12 px-8 text-base gap-2"
                >
                  Start Session
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Tips */}
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              Tip: Use keyboard shortcuts during calls — press <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">?</kbd> to see all shortcuts
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Active Dialer - 3-Column Layout
  return (
    <>
      <div className="h-full flex flex-col bg-background">
        {/* Top Bar: Call Controls */}
        <div className="relative">
          <CallControlsHeader onShowShortcuts={() => setShowHelp(true)} />
          {/* Autosave indicator */}
          {isSaving && (
            <div className="absolute top-2 right-14 flex items-center">
              <Badge variant="secondary" className="text-[10px] gap-1">
                <Save className="h-3 w-3 animate-pulse" />
                Saving...
              </Badge>
            </div>
          )}
        </div>

        {/* Main Content: 3-Column Layout */}
        <div className="flex-1 flex min-h-0">
          {/* Column 1: Call Queue (keep same width) */}
          <div className="w-64 border-r bg-card/30 flex flex-col shrink-0">
            <CallQueue companiesById={companiesById} />
          </div>

          {/* Column 2: Contact + Company Info (flex grow) */}
          <div className="flex-1 border-r flex flex-col min-w-0">
            {currentContact ? (
              <div className="flex-1 overflow-y-auto p-4">
                <ContactPanelCompact />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-muted-foreground">No contact selected</p>
              </div>
            )}
          </div>

          {/* Column 3: Notes + Tasks (fixed width) */}
          <div className="w-80 flex flex-col shrink-0 bg-card/30">
            {currentContact ? (
              <NotesAndTasks
                contact={currentContact}
                colleagues={(colleagues as Contact[]) || []}
                userId={userId}
                notes={timestampedNotes}
                elapsedSeconds={callDuration}
                isCallActive={isCallActive}
                onAddNote={addTimestampedNote}
                onUpdateNote={updateTimestampedNote}
                onDeleteNote={deleteTimestampedNote}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-muted-foreground text-sm">Select a contact</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Keyboard shortcuts help modal */}
      <ShortcutsHelp open={showHelp} onClose={() => setShowHelp(false)} />
      
      {/* Bloat fix dialog */}
      <BloatFixDialog 
        open={showBloatDialog} 
        onOpenChange={setShowBloatDialog}
        bloatStatus={bloatStatus}
        onSuccess={refreshBloatStatus}
      />
    </>
  );
}
