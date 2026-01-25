"use client";

import { useState } from "react";
import { useDialerStore, type PhoneType } from "@/stores/dialer-store";
import { useLogCall } from "@/hooks/use-calls";
import { useUpdateContact } from "@/hooks/use-contacts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDuration, copyToClipboard } from "@/lib/utils";
import { MeetingDialog } from "./meeting-dialog";
import {
  Phone,
  PhoneOff,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Copy,
  Save,
  ExternalLink,
  X,
  Check,
  Calendar,
  Smartphone,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_USER_ID } from "@/lib/default-user";
import { AbuButton } from "@/components/ui/abu-button";

export function CallControlsHeader() {
  const userId = DEFAULT_USER_ID;
  const [copied, setCopied] = useState(false);
  const [showMeetingDialog, setShowMeetingDialog] = useState(false);
  
  const {
    currentContact,
    currentIndex,
    queue,
    isCallActive,
    callDuration,
    notes,
    outcome,
    disposition,
    confirmedBudget,
    confirmedAuthority,
    confirmedNeed,
    confirmedTimeline,
    timestampedNotes,
    selectedPhoneType,
    setSelectedPhoneType,
    getSelectedPhone,
    startCall,
    endCall,
    nextContact,
    previousContact,
    skipContact,
    endSession,
  } = useDialerStore();

  const logCall = useLogCall();
  const updateContact = useUpdateContact();

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
    toast.info("Call ended. Don't forget to log your outcome.");
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
          started_at: new Date().toISOString(),
          ended_at: new Date().toISOString(),
          duration_seconds: 0,
          outcome: "skipped",
          phone_used: selectedPhoneType,
        },
      });
      toast.info("Contact skipped");
      nextContact();
    } catch (error: any) {
      // If logging fails, still skip to next contact
      console.error("Failed to log skip:", error);
      skipContact();
    }
  };

  const handleSaveAndNext = async () => {
    if (!currentContact) {
      toast.error("Cannot save call");
      return;
    }

    if (!outcome) {
      toast.error("Please select a call outcome");
      return;
    }

    try {
      await logCall.mutateAsync({
        call: {
          user_id: userId,
          contact_id: currentContact.id,
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

      await updateContact.mutateAsync({
        id: currentContact.id,
        updates: {
          has_budget: confirmedBudget,
          is_authority: confirmedAuthority,
          has_need: confirmedNeed,
          has_timeline: confirmedTimeline,
          stage: outcome === "connected" && disposition?.includes("interested") ? "qualified" : currentContact.stage,
        },
      });

      toast.success("Call saved!");
      nextContact();
    } catch (error: any) {
      toast.error(error.message || "Failed to save call");
    }
  };

  const formatPhoneDisplay = (phone: string | null | undefined, type: PhoneType) => {
    if (!phone) return null;
    // Show last 4 digits for quick reference
    const last4 = phone.replace(/\D/g, "").slice(-4);
    return `${type === "mobile" ? "📱" : "🏢"} ...${last4}`;
  };

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === queue.length - 1;

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card shrink-0">
        {/* Left: Status + Navigation */}
        <div className="flex items-center gap-4">
          {/* Status Indicator */}
          <div className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
            isCallActive 
              ? "bg-green-500/20 ring-2 ring-green-500/50" 
              : "bg-primary/10"
          }`}>
            <Phone className={`h-5 w-5 ${isCallActive ? "text-green-500" : "text-primary"}`} />
          </div>
          
          {/* Position + Timer */}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">
                {isCallActive ? "Call Active" : "Ready to Dial"}
              </span>
              {isCallActive && (
                <Badge className="bg-green-500/10 text-green-600 border-green-500/30 font-mono">
                  {formatDuration(callDuration)}
                </Badge>
              )}
            </div>
            <span className="text-sm text-muted-foreground">
              Contact {currentIndex + 1} of {queue.length}
            </span>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1 ml-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={previousContact}
              disabled={isFirst}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={nextContact}
              disabled={isLast}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Center: Phone Selector + Main Call Actions */}
        <div className="flex items-center gap-3">
          {!isCallActive ? (
            <>
              {/* Phone Number Selector */}
              {hasBothNumbers ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-10 gap-2 min-w-[140px] justify-between">
                      <div className="flex items-center gap-2">
                        {selectedPhoneType === "mobile" ? (
                          <Smartphone className="h-4 w-4 text-blue-500" />
                        ) : (
                          <Building2 className="h-4 w-4 text-amber-500" />
                        )}
                        <span className="font-mono text-sm">
                          {selectedPhoneType === "mobile" ? "Mobile" : "Office"}
                        </span>
                      </div>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center">
                    <DropdownMenuItem 
                      onClick={() => setSelectedPhoneType("mobile")}
                      className="gap-2"
                    >
                      <Smartphone className="h-4 w-4 text-blue-500" />
                      <span>Mobile</span>
                      <span className="text-xs text-muted-foreground ml-auto font-mono">
                        {mobileNumber}
                      </span>
                      {selectedPhoneType === "mobile" && <Check className="h-4 w-4 text-green-500 ml-2" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setSelectedPhoneType("office")}
                      className="gap-2"
                    >
                      <Building2 className="h-4 w-4 text-amber-500" />
                      <span>Office</span>
                      <span className="text-xs text-muted-foreground ml-auto font-mono">
                        {officeNumber}
                      </span>
                      {selectedPhoneType === "office" && <Check className="h-4 w-4 text-green-500 ml-2" />}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                // Single number display
                <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md">
                  {mobileNumber ? (
                    <Smartphone className="h-4 w-4 text-blue-500" />
                  ) : (
                    <Building2 className="h-4 w-4 text-amber-500" />
                  )}
                  <span className="font-mono text-sm">{selectedPhone || "No number"}</span>
                </div>
              )}

              {/* Copy Number Button */}
              <Button 
                variant="outline" 
                size="default" 
                onClick={handleCopyNumber}
                className="h-10 gap-2"
                disabled={!selectedPhone}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                Copy
              </Button>
              
              {/* DIAL BUTTON - Large and Prominent */}
              <Button 
                size="lg" 
                onClick={dialGoogleVoice}
                disabled={!selectedPhone}
                className="h-12 px-6 text-base font-semibold gap-2 bg-green-600 hover:bg-green-700 text-white shadow-lg"
              >
                <Phone className="h-5 w-5" />
                DIAL
                <ExternalLink className="h-4 w-4 ml-1" />
              </Button>

              {/* Meeting Button - Right next to Dial */}
              <Button
                variant="outline"
                size="lg"
                onClick={() => setShowMeetingDialog(true)}
                className="h-12 px-4 gap-2"
              >
                <Calendar className="h-5 w-5" />
                Meeting
              </Button>
            </>
          ) : (
            <>
              {/* Active Call - Show which number */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-md text-sm">
                {selectedPhoneType === "mobile" ? (
                  <Smartphone className="h-4 w-4 text-blue-500" />
                ) : (
                  <Building2 className="h-4 w-4 text-amber-500" />
                )}
                <span className="text-muted-foreground">
                  {selectedPhoneType === "mobile" ? "Mobile" : "Office"}
                </span>
              </div>

              {/* Active Call Timer */}
              <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="font-mono text-lg font-bold">
                  {formatDuration(callDuration)}
                </span>
              </div>
              
              {/* End Call Button */}
              <Button 
                variant="destructive" 
                size="lg"
                onClick={handleEndCall}
                className="h-12 px-6 text-base font-semibold gap-2"
              >
                <PhoneOff className="h-5 w-5" />
                End Call
              </Button>
            </>
          )}
        </div>

        {/* Right: Save Actions */}
        <div className="flex items-center gap-2">
          <AbuButton 
            size="default"
            contactName={currentContact ? `${currentContact.first_name} ${currentContact.last_name || ''}`.trim() : undefined}
          />
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
          <Button
            size="default"
            onClick={handleSaveAndNext}
            disabled={!outcome || logCall.isPending}
            className="h-10 gap-2 font-semibold"
          >
            <Save className="h-4 w-4" />
            Save & Next
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={endSession} 
            className="h-10 w-10 text-muted-foreground hover:text-destructive"
            title="End Session"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Meeting Dialog */}
      {currentContact && (
        <MeetingDialog
          open={showMeetingDialog}
          onOpenChange={setShowMeetingDialog}
          contact={currentContact}
          userId={userId}
        />
      )}
    </>
  );
}

// Keep the old component for backwards compatibility
/** @deprecated Use CallControlsHeader instead */
export function CallControls() {
  return <CallControlsHeader />;
}
