"use client";

import { useState } from "react";
import { useDialerStore, type PhoneType } from "@/stores/dialer-store";
import { useLogCall, useSessionCallStats } from "@/hooks/use-calls";
import { useUpdateContact, useDeleteContact } from "@/hooks/use-contacts";
import type { Contact } from "@/types/database";
import { useSessionDuration } from "@/hooks/use-session-duration";
import { usePauseSession } from "@/hooks/use-sessions";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send } from "lucide-react";
import { SessionSummaryDialog } from "./session-summary-dialog";
import { DialerPoolDialog, isEntityPaused } from "./dialer-pool-dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDuration, copyToClipboard, addBusinessDays, formatDateForDB } from "@/lib/utils";
import { MeetingDialog } from "./meeting-dialog";
import {
  Phone,
  PhoneOff,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Copy,
  ExternalLink,
  X,
  Check,
  Calendar,
  Smartphone,
  Building2,
  PhoneCall,
  Voicemail,
  PhoneMissed,
  Clock,
  MoreHorizontal,
  Keyboard,
  LogOut,
  Home,
  Repeat,
  Star,
  PauseCircle,
  Trash2,
  Bot,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthId } from "@/hooks/use-auth";
import { AbuButton } from "@/components/ui/abu-button";
import { PICKUP_DISPOSITIONS } from "@/lib/constants";

// Outcome chip options for quick selection with keyboard shortcut hints
const OUTCOME_OPTIONS = [
  { value: "connected", label: "Connected", icon: PhoneCall, color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20", key: "1" },
  { value: "voicemail", label: "Voicemail", icon: Voicemail, color: "bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/20", key: "2" },
  { value: "no_answer", label: "No Answer", icon: PhoneMissed, color: "bg-slate-500/10 text-slate-600 border-slate-500/30 hover:bg-slate-500/20", key: "3" },
  { value: "ai_screener", label: "AI Screener", icon: Bot, color: "bg-purple-500/10 text-purple-600 border-purple-500/30 hover:bg-purple-500/20", key: "4" },
  { value: "wrong_number", label: "Wrong #", icon: X, color: "bg-red-500/10 text-red-600 border-red-500/30 hover:bg-red-500/20", key: "5" },
] as const;

// Cadence options for quick override
const CADENCE_OPTIONS = [
  { value: 2, label: "2 days" },
  { value: 3, label: "3 days" },
  { value: 5, label: "5 days" },
  { value: 7, label: "1 week" },
  { value: 14, label: "2 weeks" },
] as const;

// Cadence options for "Other" pickup disposition (all values are business days)
const OTHER_CADENCE_OPTIONS = [
  { value: 5, label: "5 days" },
  { value: 10, label: "2 weeks" },
  { value: 22, label: "1 month" },
  { value: 66, label: "3 months" },
] as const;

interface CallControlsHeaderProps {
  onShowShortcuts?: () => void;
}

export function CallControlsHeader({ onShowShortcuts }: CallControlsHeaderProps = {}) {
  const userId = useAuthId()!;
  const [copied, setCopied] = useState(false);
  const [showMeetingDialog, setShowMeetingDialog] = useState(false);
  const [meetingDialogContact, setMeetingDialogContact] = useState<Contact | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false);
  
  const {
    currentContact,
    currentIndex,
    queue,
    isCallActive,
    callDuration,
    outcome,
    notes,
    timestampedNotes,
    disposition,
    confirmedBudget,
    confirmedAuthority,
    confirmedNeed,
    confirmedTimeline,
    selectedPhoneType,
    sessionStartTime,
    sessionDbId,
    setSelectedPhoneType,
    getSelectedPhone,
    setOutcome,
    setDisposition,
    startCall,
    endCall,
    nextContact,
    previousContact,
    skipContact,
    pauseSession,
    removeContactFromQueue,
  } = useDialerStore();

  const logCall = useLogCall();
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();
  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // State for "Other" disposition option
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherDispositionText, setOtherDispositionText] = useState("");
  const [otherCadenceDays, setOtherCadenceDays] = useState(5); // Default 5 business days
  
  // Get dialog state from store (shared with power-dialer for keyboard shortcuts)
  const showOutcomeDialog = useDialerStore((s) => s.showOutcomeDialog);
  const awaitingPickup = useDialerStore((s) => s.awaitingPickupSelection);
  const setShowOutcomeDialog = useDialerStore((s) => s.setShowOutcomeDialog);
  const setAwaitingPickup = useDialerStore((s) => s.setAwaitingPickupSelection);
  const openOutcomeDialog = useDialerStore((s) => s.openOutcomeDialog);
  const closeOutcomeDialog = useDialerStore((s) => s.closeOutcomeDialog);
  
  // Keyboard shortcuts for Cmd+D (delete) and Cmd+P (remove from pool)
  useKeyboardShortcuts([
    { key: "d", meta: true, action: () => currentContact && setDeleteDialogOpen(true), description: "Delete contact" },
    { key: "p", meta: true, action: () => currentContact && setPauseDialogOpen(true), description: "Remove from dialer pool" },
  ]);
  
  // Fetch session call stats for summary dialog
  const { data: callStats } = useSessionCallStats(sessionStartTime);
  
  // Pause-aware session duration (freezes when paused)
  const sessionDuration = useSessionDuration();

  // DB persistence for pause
  const pauseSessionDb = usePauseSession();

  // Get available phone numbers
  const mobileNumber = currentContact?.mobile;
  const officeNumber = currentContact?.phone;
  const hasBothNumbers = !!(mobileNumber && officeNumber && mobileNumber !== officeNumber);
  const selectedPhone = getSelectedPhone();

  const dialGoogleVoice = () => {
    const phoneToCall = selectedPhone;
    if (!phoneToCall) {
      toast.error("No phone number available");
      return;
    }

    const cleanNumber = phoneToCall.replace(/\D/g, "");
    
    window.open(
      `https://voice.google.com/u/0/calls?a=nc,${cleanNumber}`,
      "googleVoice",
      "width=400,height=600,left=100,top=100"
    );

    startCall();
    toast.success(`Calling ${selectedPhoneType === "mobile" ? "mobile" : "office"}! Timer started.`);
  };

  const handleCopyNumber = async () => {
    const phoneToCopy = selectedPhone;
    if (!phoneToCopy) return;
    await copyToClipboard(phoneToCopy);
    setCopied(true);
    toast.success("Phone number copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEndCall = () => {
    endCall();
    toast.info("Call ended. Select an outcome below.");
  };

  // Skip: Log that we didn't call this contact (for tracking who still needs to be called)
  const handleSkip = async () => {
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
      removeContactFromQueue(currentContact.id);
    } catch (error: any) {
      // If logging fails, still skip to next contact
      console.error("Failed to log skip:", error);
      skipContact();
    }
  };

  // Handle outcome selection - for "connected", show pickup popup; for others, save immediately
  const handleOutcomeClick = (selectedOutcome: string) => {
    if (!currentContact || isSaving) return;

    if (selectedOutcome === "connected") {
      // Two-step flow: set outcome to connected and show pickup popup
      setOutcome("connected");
      useDialerStore.getState().openPickupDialog(); // Show the popup for pickup selection
    } else {
      // Non-connected outcomes: save immediately (single-step)
      handleSaveCall(selectedOutcome, null);
    }
  };

  // Handle pickup disposition selection (second step of connected flow)
  const handlePickupSelection = (pickupDisposition: string, cadenceOverride?: number) => {
    if (!currentContact || isSaving) return;
    
    // Close dialog and save with the pickup disposition
    closeOutcomeDialog();
    handleSaveCall("connected", pickupDisposition, cadenceOverride);
  };

  // Core save logic used by both flows
  const handleSaveCall = async (selectedOutcome: string, selectedDisposition: string | null, cadenceOverride?: number) => {
    if (!currentContact || isSaving) return;

    setIsSaving(true);
    setOutcome(selectedOutcome as any);
    if (selectedDisposition) {
      setDisposition(selectedDisposition as any);
    }

    try {
      // Log the call
      await logCall.mutateAsync({
        call: {
          user_id: userId,
          contact_id: currentContact.id,
          company_id: currentContact.company_id || null,
          session_id: sessionDbId || undefined,
          started_at: new Date(Date.now() - callDuration * 1000).toISOString(),
          ended_at: new Date().toISOString(),
          duration_seconds: callDuration,
          outcome: selectedOutcome,
          disposition: selectedDisposition || disposition || undefined,
          phone_used: selectedPhoneType,
          notes: notes || undefined,
          confirmed_budget: confirmedBudget,
          confirmed_authority: confirmedAuthority,
          confirmed_need: confirmedNeed,
          confirmed_timeline: confirmedTimeline,
          timestamped_notes: timestampedNotes.length > 0 ? timestampedNotes : undefined,
        },
      });

      // Update contact BANT and stage: qualified if connected + positive; else contacted if fresh; else keep
      const finalDisposition = selectedDisposition || disposition;
      const positiveDisposition = finalDisposition === "meeting" || finalDisposition === "interested_follow_up" || finalDisposition?.includes("interested");
      const newStage =
        selectedOutcome === "connected" && positiveDisposition
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

      // For "Other" disposition with cadence override, set the contact's cadence and next call date
      if (selectedDisposition?.startsWith("other") && cadenceOverride != null) {
        await updateContact.mutateAsync({
          id: currentContact.id,
          updates: {
            cadence_days: cadenceOverride,
            next_call_date: formatDateForDB(addBusinessDays(new Date(), cadenceOverride)),
          },
        });
      }

      toast.success(`Call saved: ${selectedOutcome.replace("_", " ")}${selectedDisposition ? ` - ${selectedDisposition.replace(/_/g, " ")}` : ""}`);
      setAwaitingPickup(false);
      if (selectedDisposition === "meeting") {
        setMeetingDialogContact(currentContact);
        setShowMeetingDialog(true);
      }
      removeContactFromQueue(currentContact.id);
    } catch (error: any) {
      toast.error(error.message || "Failed to save call");
      // Keep the outcome selected so user can retry
    } finally {
      setIsSaving(false);
    }
  };

  // Legacy function kept for compatibility - redirects to new handler
  const handleOutcomeAndSave = async (selectedOutcome: string) => {
    handleOutcomeClick(selectedOutcome);
  };

  // Handle cadence override for current contact
  const handleCadenceChange = async (days: number) => {
    if (!currentContact) return;
    
    try {
      await updateContact.mutateAsync({
        id: currentContact.id,
        updates: {
          cadence_days: days,
        },
      });
      toast.success(`Cadence set to ${days} days for this contact`);
    } catch (error: any) {
      toast.error(error.message || "Failed to update cadence");
    }
  };

  // Handle deleting the current contact
  const handleDeleteContact = async () => {
    if (!currentContact) return;
    
    try {
      await deleteContact.mutateAsync(currentContact.id);
      // Remove from dialer queue immediately
      removeContactFromQueue(currentContact.id);
      toast.success("Contact deleted");
      setDeleteDialogOpen(false);
      // The store will advance to next contact or end session if queue is empty
    } catch (error: any) {
      toast.error(error.message || "Failed to delete contact");
    }
  };

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === queue.length - 1;
  const contactName = currentContact 
    ? `${currentContact.first_name} ${currentContact.last_name || ''}`.trim()
    : '';
  // Block advancing without logging: if call ended and not yet saved, require outcome selection first
  const callEndedAwaitingOutcome = !isCallActive && callDuration > 0;

  return (
    <>
      {/* Main Header with Gradient Background */}
      <div className={cn(
        "relative px-4 py-3 border-b shrink-0 transition-all duration-500",
        isCallActive 
          ? "bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-500/20 dark:via-emerald-500/10"
          : "bg-card"
      )}>
        {/* Pulse effect when call is active */}
        {isCallActive && (
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent animate-pulse pointer-events-none" />
        )}

        <div className="relative flex items-center justify-between gap-4">
          {/* Left: Contact Info + Navigation */}
          <div className="flex items-center gap-4 min-w-0">
            {/* Status Indicator */}
            <div className={cn(
              "relative flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 shrink-0",
              isCallActive 
                ? "bg-emerald-500 shadow-lg shadow-emerald-500/30" 
                : "bg-primary/10"
            )}>
              <Phone className={cn(
                "h-6 w-6 transition-colors",
                isCallActive ? "text-white" : "text-primary"
              )} />
              {isCallActive && (
                <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              )}
            </div>
            
            {/* Contact Name + Position */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-lg truncate">
                  {contactName || "No Contact"}
                </h2>
                {currentContact && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          updateContact.mutate(
                            { id: currentContact.id, updates: { is_aaa: !currentContact.is_aaa } },
                            {
                              onSuccess: () => {
                                toast.success(currentContact.is_aaa ? "Removed AAA status" : "Marked as AAA priority");
                              },
                              onError: () => toast.error("Failed to update AAA status"),
                            }
                          );
                        }}
                        className="p-1 rounded hover:bg-muted/50 transition-colors shrink-0"
                      >
                        <Star 
                          className={cn(
                            "h-4 w-4 transition-colors",
                            currentContact.is_aaa 
                              ? "fill-amber-500 text-amber-500" 
                              : "text-muted-foreground hover:text-amber-500"
                          )} 
                        />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {currentContact.is_aaa ? "Remove AAA priority" : "Mark as AAA priority"}
                    </TooltipContent>
                  </Tooltip>
                )}
                {currentContact?.company_name && (
                  <Badge variant="secondary" className="text-xs font-medium shrink-0">
                    {currentContact.company_name}
                  </Badge>
                )}
                {isCallActive && (
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-mono text-sm shrink-0">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {formatDuration(callDuration)}
                    </span>
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>Contact {currentIndex + 1} of {queue.length}</span>
                {currentContact?.title && (
                  <>
                    <span className="text-border">•</span>
                    <span className="truncate">{currentContact.title}</span>
                  </>
                )}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-1 ml-2 shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-full"
                    onClick={previousContact}
                    disabled={isFirst}
                    aria-label="Previous contact"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <span className="flex items-center gap-1.5">
                    Previous contact
                    <kbd className="px-1.5 py-0.5 text-[10px] bg-muted rounded font-mono">←</kbd>
                  </span>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-full"
                    onClick={nextContact}
                    disabled={isLast || callEndedAwaitingOutcome}
                    aria-label="Next contact"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <span className="flex items-center gap-1.5">
                    {callEndedAwaitingOutcome
                      ? "Select an outcome below to save and continue"
                      : "Next contact"}
                    {!callEndedAwaitingOutcome && (
                      <kbd className="px-1.5 py-0.5 text-[10px] bg-muted rounded font-mono">→</kbd>
                    )}
                  </span>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Center: Phone Selector + Main Call Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {!isCallActive ? (
              <>
                {/* Phone Number Selector */}
                {hasBothNumbers ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="h-11 gap-2 min-w-[130px] justify-between">
                        <div className="flex items-center gap-2">
                          {selectedPhoneType === "mobile" ? (
                            <Smartphone className="h-4 w-4 text-blue-500" />
                          ) : (
                            <Building2 className="h-4 w-4 text-amber-500" />
                          )}
                          <span className="font-medium text-sm">
                            {selectedPhoneType === "mobile" ? "Mobile" : "Office"}
                          </span>
                        </div>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-56">
                      <DropdownMenuItem 
                        onClick={() => setSelectedPhoneType("mobile")}
                        className="gap-2 py-2.5"
                      >
                        <Smartphone className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">Mobile</span>
                        <span className="text-xs text-muted-foreground ml-auto font-mono">
                          {mobileNumber}
                        </span>
                        {selectedPhoneType === "mobile" && <Check className="h-4 w-4 text-emerald-500 ml-2" />}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setSelectedPhoneType("office")}
                        className="gap-2 py-2.5"
                      >
                        <Building2 className="h-4 w-4 text-amber-500" />
                        <span className="font-medium">Office</span>
                        <span className="text-xs text-muted-foreground ml-auto font-mono">
                          {officeNumber}
                        </span>
                        {selectedPhoneType === "office" && <Check className="h-4 w-4 text-emerald-500 ml-2" />}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  // Single number display
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/50 rounded-lg border">
                    {mobileNumber ? (
                      <Smartphone className="h-4 w-4 text-blue-500" />
                    ) : (
                      <Building2 className="h-4 w-4 text-amber-500" />
                    )}
                    <span className="font-mono text-sm font-medium">{selectedPhone || "No number"}</span>
                  </div>
                )}

                {/* Copy Number Button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={handleCopyNumber}
                      className="h-11 w-11"
                      disabled={!selectedPhone}
                      aria-label="Copy phone number"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Copy number</TooltipContent>
                </Tooltip>
                
                {/* DIAL BUTTON - Large and Prominent with Gradient */}
                <Button 
                  size="lg" 
                  onClick={dialGoogleVoice}
                  disabled={!selectedPhone}
                  className={cn(
                    "h-12 px-8 text-base font-bold gap-2 shadow-lg transition-all duration-200",
                    "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700",
                    "text-white border-0",
                    "hover:shadow-emerald-500/25 hover:shadow-xl hover:scale-[1.02]",
                    "active:scale-[0.98]"
                  )}
                >
                  <Phone className="h-5 w-5" />
                  DIAL
                  <ExternalLink className="h-4 w-4 opacity-70" />
                </Button>

                {/* Meeting Button */}
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setShowMeetingDialog(true)}
                  className="h-12 px-5 gap-2 font-medium"
                >
                  <Calendar className="h-5 w-5" />
                  Meeting
                </Button>
              </>
            ) : (
              <>
                {/* Active Call - Show which number */}
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg text-sm">
                  {selectedPhoneType === "mobile" ? (
                    <Smartphone className="h-4 w-4 text-blue-500" />
                  ) : (
                    <Building2 className="h-4 w-4 text-amber-500" />
                  )}
                  <span className="text-muted-foreground font-medium">
                    {selectedPhoneType === "mobile" ? "Mobile" : "Office"}
                  </span>
                </div>

                {/* Active Call Timer - Prominent Display */}
                <div className="flex items-center gap-3 px-5 py-2.5 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-full border border-emerald-500/30">
                  <div className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </div>
                  <span className="font-mono text-xl font-bold tracking-tight">
                    {formatDuration(callDuration)}
                  </span>
                </div>
                
                {/* End Call Button - Large and Red */}
                <Button 
                  size="lg"
                  onClick={handleEndCall}
                  className={cn(
                    "h-12 px-8 text-base font-bold gap-2 shadow-lg transition-all duration-200",
                    "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700",
                    "text-white border-0",
                    "hover:shadow-red-500/25 hover:shadow-xl hover:scale-[1.02]",
                    "active:scale-[0.98]"
                  )}
                >
                  <PhoneOff className="h-5 w-5" />
                  END CALL
                </Button>
              </>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Session Timer - always visible */}
            <Badge variant="outline" className="font-mono text-xs gap-1.5 shrink-0 h-8 px-2.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              {formatDuration(sessionDuration)}
            </Badge>
            <AbuButton 
              size="default"
              contactName={contactName || undefined}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="default" 
                  onClick={handleSkip}
                  disabled={logCall.isPending}
                  className="h-10 gap-2"
                >
                  <SkipForward className="h-4 w-4" />
                  Skip
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <span className="flex items-center gap-1.5">
                  Skip contact
                  <kbd className="px-1.5 py-0.5 text-[10px] bg-muted rounded font-mono">S</kbd>
                </span>
              </TooltipContent>
            </Tooltip>
            {/* More Actions Overflow Menu */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-10 w-10"
                      aria-label="More actions"
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">More actions</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-56">
                {onShowShortcuts && (
                  <DropdownMenuItem onClick={onShowShortcuts} className="gap-2">
                    <Keyboard className="h-4 w-4" />
                    <span>Keyboard shortcuts</span>
                    <kbd className="ml-auto px-1.5 py-0.5 text-[10px] bg-muted rounded font-mono">?</kbd>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {/* Cadence Override Sub-section */}
                <div className="px-2 py-1.5">
                  <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                    <Repeat className="h-3 w-3" />
                    Call Cadence
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {CADENCE_OPTIONS.map((opt) => {
                      const isCurrentCadence = currentContact?.cadence_days === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => handleCadenceChange(opt.value)}
                          className={cn(
                            "px-2 py-1 text-xs rounded-md border transition-colors",
                            isCurrentCadence
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted/50 hover:bg-muted border-transparent"
                          )}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setPauseDialogOpen(true)} 
                  className="gap-2 text-amber-600"
                  disabled={!currentContact}
                >
                  <PauseCircle className="h-4 w-4" />
                  <span>Remove from Dialer Pool</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setDeleteDialogOpen(true)} 
                  className="gap-2 text-destructive focus:text-destructive"
                  disabled={!currentContact}
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Contact</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                  pauseSession();
                  if (sessionDbId) pauseSessionDb.mutate(sessionDbId);
                }} className="gap-2">
                  <Home className="h-4 w-4" />
                  <span>Pause & Go Home</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setShowSummary(true)} 
                  className="gap-2 text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  <span>End Session</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Outcome Quick-Select Chips - Show after call ends or when no outcome selected */}
        {!isCallActive && callDuration > 0 && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-muted-foreground mr-1">
                {isSaving ? "Saving..." : "Select outcome:"}
              </span>
              {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              {OUTCOME_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = outcome === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleOutcomeClick(opt.value)}
                    disabled={isSaving}
                    title={`Press ${opt.key} for ${opt.label}`}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200",
                      isSaving && "opacity-50 cursor-not-allowed",
                      isSelected 
                        ? cn(opt.color, "ring-2 ring-offset-1 ring-current/30") 
                        : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                    )}
                  >
                    <kbd className="w-4 h-4 flex items-center justify-center rounded bg-background/50 text-[10px] font-mono font-bold">
                      {opt.key}
                    </kbd>
                    <Icon className="h-3.5 w-3.5" />
                    {opt.label}
                    {isSelected && <Check className="h-3 w-3 ml-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Meeting Dialog */}
      {(meetingDialogContact || currentContact) && (
        <MeetingDialog
          open={showMeetingDialog}
          onOpenChange={(open) => {
            setShowMeetingDialog(open);
            if (!open) setMeetingDialogContact(null);
          }}
          contact={(meetingDialogContact ?? currentContact)!}
          userId={userId}
        />
      )}

      {/* Session Summary Dialog */}
      <SessionSummaryDialog
        open={showSummary}
        onClose={() => setShowSummary(false)}
        stats={{
          duration: sessionDuration,
          contactsProcessed: callStats?.total || 0,
          totalContacts: queue.length,
          connected: callStats?.connected || 0,
          voicemail: callStats?.voicemail || 0,
          noAnswer: callStats?.noAnswer || 0,
          skipped: callStats?.skipped || 0,
          aiScreener: callStats?.aiScreener || 0,
          wrongNumber: callStats?.wrongNumber || 0,
          meetingsBooked: callStats?.meetingsBooked || 0,
        }}
      />

      {/* Dialer Pool Dialog - Remove contact from pool */}
      {currentContact && (
        <DialerPoolDialog
          open={pauseDialogOpen}
          onOpenChange={setPauseDialogOpen}
          entityType="contact"
          entityId={currentContact.id}
          entityName={`${currentContact.first_name} ${currentContact.last_name || ""}`.trim()}
          isPaused={isEntityPaused(currentContact.dialer_paused_until)}
          pausedUntil={currentContact.dialer_paused_until}
          onSuccess={() => {
            // Move to next contact after pausing
            skipContact();
          }}
        />
      )}

      {/* Delete Contact Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{contactName}</strong>? 
              This will permanently remove the contact and all related data (calls, notes, tasks). 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteContact}
              disabled={deleteContact.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteContact.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pickup Disposition Dialog - Shows ONLY after selecting "Connected" */}
      <Dialog 
        open={showOutcomeDialog && awaitingPickup} 
        onOpenChange={(open) => {
          if (!open) {
            closeOutcomeDialog();
            setOutcome(null);
            // Reset "Other" state
            setShowOtherInput(false);
            setOtherDispositionText("");
            setOtherCadenceDays(5);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <PhoneCall className="h-5 w-5" />
              Connected! What happened?
            </DialogTitle>
            <DialogDescription>
              Select the result of this call with {contactName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 gap-2 py-4">
            {PICKUP_DISPOSITIONS.map((opt, index) => {
              const keyNumber = index + 1;
              const isOther = opt.value === "other";
              const isOtherSelected = isOther && showOtherInput;
              
              return (
                <Button
                  key={opt.value}
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    if (isOther) {
                      // Toggle "Other" input visibility
                      setShowOtherInput(!showOtherInput);
                    } else {
                      // Reset "Other" state and select this option
                      setShowOtherInput(false);
                      setOtherDispositionText("");
                      setOtherCadenceDays(5);
                      handlePickupSelection(opt.value);
                    }
                  }}
                  disabled={isSaving}
                  className={cn(
                    "h-14 justify-start text-left gap-3 px-4",
                    "hover:bg-emerald-500/10 hover:border-emerald-500/50 hover:text-emerald-700 dark:hover:text-emerald-300",
                    "transition-all duration-150",
                    isOtherSelected && "bg-emerald-500/10 border-emerald-500/50 text-emerald-700 dark:text-emerald-300"
                  )}
                >
                  <kbd className="w-8 h-8 flex items-center justify-center rounded-lg bg-muted text-sm font-mono font-bold shrink-0">
                    {keyNumber}
                  </kbd>
                  <div className="flex flex-col items-start">
                    <span className="font-semibold">{opt.label}</span>
                    <span className="text-xs text-muted-foreground font-normal">
                      {opt.description}
                    </span>
                  </div>
                </Button>
              );
            })}
          </div>

          {/* "Other" text input and cadence - shows when Other is selected */}
          {showOtherInput && (
            <div className="space-y-3 pb-4">
              {/* Text input */}
              <Input
                value={otherDispositionText}
                onChange={(e) => setOtherDispositionText(e.target.value)}
                placeholder="What happened on this call?"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && otherDispositionText.trim()) {
                    handlePickupSelection(`other: ${otherDispositionText.trim()}`, otherCadenceDays);
                  }
                }}
              />
              
              {/* Cadence selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground shrink-0">Follow up in:</span>
                <div className="flex flex-wrap gap-1.5">
                  {OTHER_CADENCE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setOtherCadenceDays(opt.value)}
                      className={cn(
                        "px-2.5 py-1 text-xs rounded-md border transition-colors",
                        otherCadenceDays === opt.value
                          ? "bg-emerald-500 text-white border-emerald-500"
                          : "bg-muted/50 hover:bg-muted border-transparent"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Save button */}
              <Button
                onClick={() => {
                  if (otherDispositionText.trim()) {
                    handlePickupSelection(`other: ${otherDispositionText.trim()}`, otherCadenceDays);
                  }
                }}
                disabled={!otherDispositionText.trim() || isSaving}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          )}

          {isSaving && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// Keep the old component for backwards compatibility
/** @deprecated Use CallControlsHeader instead */
export function CallControls() {
  return <CallControlsHeader />;
}
