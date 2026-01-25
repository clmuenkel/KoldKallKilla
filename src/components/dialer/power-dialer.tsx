"use client";

import { useDialerStore } from "@/stores/dialer-store";
import { useCallTimer } from "@/hooks/use-call-timer";
import { useContacts } from "@/hooks/use-contacts";
import { useCompanyColleagues } from "@/hooks/use-companies";
import { useDialerAutosave, useHydrateDraft } from "@/hooks/use-dialer-autosave";
import { CallQueue } from "./call-queue";
import { ContactPanelCompact } from "./contact-panel";
import { CallControlsHeader } from "./call-controls";
import { NotesAndTasks } from "./notes-and-tasks";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Phone, Zap, Users, Save } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_USER_ID } from "@/lib/default-user";
import type { Contact } from "@/types/database";

export function PowerDialer() {
  const userId = DEFAULT_USER_ID;

  const {
    isActive,
    queue,
    currentContact,
    currentIndex,
    isCallActive,
    callDuration,
    timestampedNotes,
    startSession,
    addTimestampedNote,
    updateTimestampedNote,
    deleteTimestampedNote,
    goToContact,
  } = useDialerStore();

  const { data: contacts, isLoading } = useContacts({
    stage: "fresh",
    limit: 100,
  });

  const { data: colleagues } = useCompanyColleagues(
    currentContact?.id || "",
    currentContact?.company_id
  );

  // Initialize call timer
  useCallTimer();

  // Autosave dialer state (debounced)
  const { isSaving } = useDialerAutosave(userId);
  
  // Hydrate from saved draft when switching contacts
  useHydrateDraft(userId);

  const handleStartSession = () => {
    if (!contacts || contacts.length === 0) {
      toast.error("No contacts to call. Import some leads first!");
      return;
    }
    startSession(contacts.filter(c => c.phone));
  };

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

  const contactsWithPhone = contacts?.filter(c => c.phone).length || 0;

  // Start Screen
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

  // Active Dialer - 3-Column Layout
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Top Bar: Call Controls */}
      <div className="relative">
        <CallControlsHeader />
        {/* Autosave indicator */}
        {isSaving && (
          <Badge variant="secondary" className="absolute top-2 right-2 text-[10px] gap-1">
            <Save className="h-3 w-3 animate-pulse" />
            Saving...
          </Badge>
        )}
      </div>

      {/* Main Content: 3-Column Layout */}
      <div className="flex-1 flex min-h-0">
        {/* Column 1: Call Queue (keep same width) */}
        <div className="w-64 border-r bg-card/30 flex flex-col shrink-0">
          <CallQueue />
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
  );
}
