"use client";

import { useDialerStore } from "@/stores/dialer-store";
import { useCallTimer } from "@/hooks/use-call-timer";
import { useContacts } from "@/hooks/use-contacts";
import { CallQueue } from "./call-queue";
import { ContactPanel } from "./contact-panel";
import { CallControls } from "./call-controls";
import { CallScript } from "./call-script";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Phone, X, Zap, Users } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_USER_ID } from "@/lib/default-user";
import { formatDuration } from "@/lib/utils";

export function PowerDialer() {
  const userId = DEFAULT_USER_ID;

  const {
    isActive,
    queue,
    currentContact,
    currentIndex,
    isCallActive,
    callDuration,
    startSession,
    endSession,
  } = useDialerStore();

  const { data: contacts, isLoading } = useContacts({
    stage: "fresh",
    limit: 100,
  });

  // Initialize call timer
  useCallTimer();

  const handleStartSession = () => {
    if (!contacts || contacts.length === 0) {
      toast.error("No contacts to call. Import some leads first!");
      return;
    }
    startSession(contacts.filter(c => c.phone)); // Only contacts with phone numbers
  };

  if (isLoading) {
    return (
      <div className="h-full p-6 space-y-4">
        <Skeleton className="h-16 w-full" />
        <div className="flex gap-4 h-[calc(100%-5rem)]">
          <Skeleton className="w-72 h-full" />
          <Skeleton className="flex-1 h-full" />
          <Skeleton className="w-80 h-full" />
        </div>
      </div>
    );
  }

  const contactsWithPhone = contacts?.filter(c => c.phone).length || 0;

  if (!isActive) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-background to-muted/30">
        <div className="text-center max-w-lg mx-auto px-6">
          <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 ring-8 ring-primary/5">
            <Phone className="h-12 w-12 text-primary" />
          </div>
          <h2 className="text-3xl font-bold mb-3 tracking-tight">Power Dialer</h2>
          <p className="text-muted-foreground mb-8 text-lg">
            Work through your leads efficiently with our focused calling experience.
          </p>
          
          {contactsWithPhone > 0 ? (
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-card rounded-full border">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{contactsWithPhone} contacts ready to call</span>
              </div>
              <div className="block">
                <Button size="lg" onClick={handleStartSession} className="h-14 px-8 text-lg gap-3">
                  <Zap className="h-5 w-5" />
                  Start Calling Session
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                No contacts with phone numbers found.
              </p>
              <Button variant="outline" size="lg" asChild>
                <a href="/import">Import from Apollo</a>
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Focus Mode Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          {/* Status Indicator */}
          <div className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
            isCallActive 
              ? "bg-green-500/20 ring-2 ring-green-500/50" 
              : "bg-amber-500/20"
          }`}>
            <Phone className={`h-5 w-5 ${isCallActive ? "text-green-500" : "text-amber-500"}`} />
          </div>
          
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold">
                {isCallActive ? "Call Active" : "Ready to Dial"}
              </h2>
              {isCallActive && (
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30 font-mono">
                  {formatDuration(callDuration)}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Contact {currentIndex + 1} of {queue.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="font-normal">
            {queue.length} in queue
          </Badge>
          <Button variant="ghost" size="sm" onClick={endSession} className="text-muted-foreground hover:text-destructive">
            <X className="mr-2 h-4 w-4" />
            End Session
          </Button>
        </div>
      </div>

      {/* Main Content - Focus Mode Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Compact Queue */}
        <div className="w-64 border-r bg-card/30 overflow-hidden flex flex-col">
          <CallQueue />
        </div>

        {/* Center: Contact Info + Notes (40%) */}
        <div className="flex-[4] flex flex-col overflow-hidden border-r">
          {currentContact ? (
            <>
              <div className="flex-1 overflow-auto">
                <ContactPanel />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground">No contact selected</p>
            </div>
          )}
        </div>

        {/* Right: Script & Checklist (60%) */}
        <div className="flex-[6] bg-card/30 overflow-hidden flex flex-col">
          <CallScript />
        </div>
      </div>

      {/* Bottom: Call Controls Bar */}
      {currentContact && <CallControls />}
    </div>
  );
}
