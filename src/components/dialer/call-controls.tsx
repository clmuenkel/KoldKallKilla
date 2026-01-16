"use client";

import { useDialerStore } from "@/stores/dialer-store";
import { useLogCall } from "@/hooks/use-calls";
import { useUpdateContact } from "@/hooks/use-contacts";
import { Button } from "@/components/ui/button";
import { formatDuration, copyToClipboard } from "@/lib/utils";
import {
  Phone,
  PhoneOff,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Copy,
  Save,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_USER_ID } from "@/lib/default-user";
import { AbuButton } from "@/components/ui/abu-button";

export function CallControls() {
  const userId = DEFAULT_USER_ID;
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
    startCall,
    endCall,
    nextContact,
    previousContact,
    skipContact,
  } = useDialerStore();

  const logCall = useLogCall();
  const updateContact = useUpdateContact();

  const dialGoogleVoice = () => {
    if (!currentContact?.phone) {
      toast.error("No phone number available");
      return;
    }

    const cleanNumber = currentContact.phone.replace(/\D/g, "");
    
    // Open Google Voice with number pre-loaded
    window.open(
      `https://voice.google.com/u/0/calls?a=nc,${cleanNumber}`,
      "googleVoice",
      "width=400,height=600,left=100,top=100"
    );

    // Start the call timer
    startCall();
    toast.success("Call initiated! Timer started.");
  };

  const handleCopyNumber = async () => {
    if (!currentContact?.phone) return;
    await copyToClipboard(currentContact.phone);
    toast.success("Phone number copied!");
  };

  const handleEndCall = () => {
    endCall();
    toast.info("Call ended. Don't forget to log your outcome.");
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
      // Log the call
      await logCall.mutateAsync({
        call: {
          user_id: userId,
          contact_id: currentContact.id,
          started_at: new Date(Date.now() - callDuration * 1000).toISOString(),
          ended_at: new Date().toISOString(),
          duration_seconds: callDuration,
          outcome,
          disposition: disposition || undefined,
          notes: notes || undefined,
          confirmed_budget: confirmedBudget,
          confirmed_authority: confirmedAuthority,
          confirmed_need: confirmedNeed,
          confirmed_timeline: confirmedTimeline,
        },
      });

      // Update contact qualification
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

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === queue.length - 1;

  return (
    <div className="border-t bg-card p-4">
      <div className="flex items-center justify-between">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={previousContact}
            disabled={isFirst}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground w-24 text-center">
            {currentIndex + 1} of {queue.length}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={nextContact}
            disabled={isLast}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Call Actions */}
        <div className="flex items-center gap-3">
          {!isCallActive ? (
            <>
              <Button variant="outline" onClick={handleCopyNumber}>
                <Copy className="mr-2 h-4 w-4" />
                Copy Number
              </Button>
              <Button size="lg" onClick={dialGoogleVoice}>
                <Phone className="mr-2 h-5 w-5" />
                Dial in Google Voice
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="font-mono font-semibold">
                  {formatDuration(callDuration)}
                </span>
              </div>
              <Button variant="destructive" onClick={handleEndCall}>
                <PhoneOff className="mr-2 h-4 w-4" />
                End Call
              </Button>
            </>
          )}
        </div>

        {/* Save Actions */}
        <div className="flex items-center gap-2">
          <AbuButton 
            size="default" 
            contactName={currentContact ? `${currentContact.first_name} ${currentContact.last_name || ''}`.trim() : undefined}
          />
          <Button variant="outline" onClick={skipContact}>
            <SkipForward className="mr-2 h-4 w-4" />
            Skip
          </Button>
          <Button
            onClick={handleSaveAndNext}
            disabled={!outcome || logCall.isPending}
          >
            <Save className="mr-2 h-4 w-4" />
            Save & Next
          </Button>
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="mt-3 flex justify-center gap-6 text-xs text-muted-foreground">
        <span><kbd className="px-1 py-0.5 bg-muted rounded">D</kbd> Dial</span>
        <span><kbd className="px-1 py-0.5 bg-muted rounded">C</kbd> Copy</span>
        <span><kbd className="px-1 py-0.5 bg-muted rounded">S</kbd> Skip</span>
        <span><kbd className="px-1 py-0.5 bg-muted rounded">Enter</kbd> Save & Next</span>
      </div>
    </div>
  );
}
