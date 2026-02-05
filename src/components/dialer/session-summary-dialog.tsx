"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDialerStore } from "@/stores/dialer-store";
import { useEndSession } from "@/hooks/use-sessions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, 
  Clock, 
  Users, 
  PhoneCall, 
  Calendar,
  Voicemail,
  PhoneMissed,
  SkipForward,
  Phone,
  Activity,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SessionStats {
  duration: number; // seconds
  contactsProcessed: number;
  totalContacts: number;
  connected: number;
  voicemail: number;
  noAnswer: number;
  skipped: number;
  aiScreener: number;
  wrongNumber: number;
  meetingsBooked: number;
}

interface SessionSummaryDialogProps {
  open: boolean;
  onClose: () => void;
  stats: SessionStats;
}

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

export function SessionSummaryDialog({ open, onClose, stats }: SessionSummaryDialogProps) {
  const router = useRouter();
  const { endSession, sessionDbId } = useDialerStore();
  const endSessionMutation = useEndSession();

  const handleEndSession = async () => {
    // End database session if we have one
    if (sessionDbId) {
      try {
        await endSessionMutation.mutateAsync(sessionDbId);
      } catch (error) {
        console.error("Failed to end session in database:", error);
      }
    }
    // Always end the store session
    endSession();
  };

  const handleViewActivity = async () => {
    await handleEndSession();
    onClose();
    router.push("/dashboard");
  };

  const handleStartNewSession = async () => {
    await handleEndSession();
    onClose();
    // Stay on dialer page - it will show setup screen
  };

  const handleDone = async () => {
    await handleEndSession();
    onClose();
  };

  const progressPercent = stats.totalContacts > 0 
    ? Math.round((stats.contactsProcessed / stats.totalContacts) * 100) 
    : 0;

  const totalCalls = stats.connected + stats.voicemail + stats.noAnswer + stats.skipped + stats.aiScreener + stats.wrongNumber;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 ring-8 ring-emerald-500/5">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <DialogTitle className="text-2xl font-bold">Session Complete</DialogTitle>
          <DialogDescription className="text-base">
            Great work! Here's your session summary.
          </DialogDescription>
        </DialogHeader>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 py-4">
          {/* Duration */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Duration</p>
              <p className="text-lg font-bold">{formatDuration(stats.duration)}</p>
            </div>
          </div>

          {/* Contacts Processed */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
            <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Contacts</p>
              <p className="text-lg font-bold">{stats.contactsProcessed} <span className="text-sm font-normal text-muted-foreground">/ {stats.totalContacts}</span></p>
            </div>
          </div>

          {/* Connected Calls */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
              <PhoneCall className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Connected</p>
              <p className="text-lg font-bold">{stats.connected}</p>
            </div>
          </div>

          {/* Meetings Booked */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
            <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
              <Calendar className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Meetings</p>
              <p className="text-lg font-bold">{stats.meetingsBooked}</p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Session Progress</span>
            <span className="font-medium">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Outcome Breakdown */}
        {totalCalls > 0 && (
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-3">Call Outcomes</p>
            <div className="flex flex-wrap gap-2">
              {stats.connected > 0 && (
                <Badge variant="secondary" className="gap-1.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                  <PhoneCall className="h-3 w-3" />
                  {stats.connected} Connected
                </Badge>
              )}
              {stats.voicemail > 0 && (
                <Badge variant="secondary" className="gap-1.5 bg-amber-500/10 text-amber-600 border-amber-500/30">
                  <Voicemail className="h-3 w-3" />
                  {stats.voicemail} Voicemail
                </Badge>
              )}
              {stats.noAnswer > 0 && (
                <Badge variant="secondary" className="gap-1.5 bg-slate-500/10 text-slate-600 border-slate-500/30">
                  <PhoneMissed className="h-3 w-3" />
                  {stats.noAnswer} No Answer
                </Badge>
              )}
              {stats.skipped > 0 && (
                <Badge variant="secondary" className="gap-1.5 bg-slate-500/10 text-slate-600 border-slate-500/30">
                  <SkipForward className="h-3 w-3" />
                  {stats.skipped} Skipped
                </Badge>
              )}
              {stats.aiScreener > 0 && (
                <Badge variant="secondary" className="gap-1.5 bg-purple-500/10 text-purple-600 border-purple-500/30">
                  <Phone className="h-3 w-3" />
                  {stats.aiScreener} AI Screener
                </Badge>
              )}
              {stats.wrongNumber > 0 && (
                <Badge variant="secondary" className="gap-1.5 bg-red-500/10 text-red-600 border-red-500/30">
                  <Phone className="h-3 w-3" />
                  {stats.wrongNumber} Wrong #
                </Badge>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
          <Button
            variant="outline"
            onClick={handleViewActivity}
            className="gap-2 flex-1"
          >
            <Activity className="h-4 w-4" />
            View Activity
          </Button>
          <Button
            variant="outline"
            onClick={handleStartNewSession}
            className="gap-2 flex-1"
          >
            <Play className="h-4 w-4" />
            New Session
          </Button>
          <Button
            onClick={handleDone}
            className="gap-2 flex-1"
          >
            <CheckCircle2 className="h-4 w-4" />
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hook to collect session stats from the store
export function useSessionStats(): SessionStats {
  const { sessionStartTime, currentIndex, queue } = useDialerStore();
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!sessionStartTime) {
      setDuration(0);
      return;
    }

    const updateDuration = () => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000);
      setDuration(elapsed);
    };

    updateDuration();
    const interval = setInterval(updateDuration, 1000);
    return () => clearInterval(interval);
  }, [sessionStartTime]);

  // Note: In a full implementation, we'd query the database for actual call outcomes
  // For now, we return the contact progress from the store
  return {
    duration,
    contactsProcessed: currentIndex,
    totalContacts: queue.length,
    connected: 0, // Would come from useSessionCallStats hook
    voicemail: 0,
    noAnswer: 0,
    skipped: 0,
    aiScreener: 0,
    wrongNumber: 0,
    meetingsBooked: 0,
  };
}
