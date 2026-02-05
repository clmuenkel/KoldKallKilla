"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useDialerStore } from "@/stores/dialer-store";
import { useSessionCallStats } from "@/hooks/use-calls";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SessionSummaryDialog } from "./session-summary-dialog";
import { Play, Square, Clock, Users, Phone } from "lucide-react";

function formatSessionDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function GlobalSessionBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [showSummary, setShowSummary] = useState(false);
  
  const {
    isActive,
    isViewingHome,
    sessionStartTime,
    queue,
    currentIndex,
    currentContact,
    resumeSession,
  } = useDialerStore();

  const [sessionDuration, setSessionDuration] = useState(0);

  // Fetch session call stats
  const { data: callStats } = useSessionCallStats(sessionStartTime);

  // Update session duration every second
  useEffect(() => {
    if (!sessionStartTime) {
      setSessionDuration(0);
      return;
    }

    const updateDuration = () => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000);
      setSessionDuration(elapsed);
    };

    updateDuration();
    const interval = setInterval(updateDuration, 1000);
    return () => clearInterval(interval);
  }, [sessionStartTime]);

  // Don't show if no active session
  if (!isActive) {
    return null;
  }

  // Don't show on the dialer page when actively dialing (not paused)
  const isOnDialerPage = pathname === "/dialer";
  if (isOnDialerPage && !isViewingHome) {
    return null;
  }

  const handleResume = () => {
    resumeSession();
    if (!isOnDialerPage) {
      router.push("/dialer");
    }
  };

  const handleEndClick = () => {
    setShowSummary(true);
  };

  // Use database-based completion count for progress
  const completedCount = callStats?.total || 0;
  const progressPercent = queue.length > 0 
    ? Math.min((completedCount / queue.length) * 100, 100) 
    : 0;
  const contactName = currentContact 
    ? `${currentContact.first_name} ${currentContact.last_name || ''}`.trim()
    : 'No contact';

  // Prepare stats for the summary dialog (use actual call count from database)
  const sessionStats = {
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
  };

  return (
    <>
      <div className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="px-4 py-2">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Status info */}
            <div className="flex items-center gap-4 min-w-0">
              {/* Live indicator + label */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-primary" />
                  <span className="text-sm font-medium">Session Active</span>
                </div>
              </div>
              
              {/* Timer */}
              <Badge variant="secondary" className="font-mono text-xs gap-1 shrink-0">
                <Clock className="h-3 w-3" />
                {formatSessionDuration(sessionDuration)}
              </Badge>

              {/* Progress info - shows completed calls from database */}
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                <Users className="h-3.5 w-3.5" />
                <span>
                  <span className="font-medium text-foreground">{completedCount}</span>
                  <span className="mx-0.5">/</span>
                  <span>{queue.length}</span>
                </span>
              </div>

              {/* Current contact - truncate on small screens */}
              <div className="hidden md:block text-xs text-muted-foreground truncate min-w-0">
                <span className="font-medium text-foreground">{contactName}</span>
              </div>

              {/* Mini progress bar */}
              <div className="hidden lg:block w-24 shrink-0">
                <Progress value={progressPercent} className="h-1" />
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                onClick={handleResume}
                size="sm"
                className="h-7 gap-1.5 text-xs font-medium"
              >
                <Play className="h-3 w-3" />
                Resume
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEndClick}
                className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-destructive"
              >
                <Square className="h-3 w-3" />
                <span className="hidden sm:inline">End</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Session Summary Dialog */}
      <SessionSummaryDialog
        open={showSummary}
        onClose={() => setShowSummary(false)}
        stats={sessionStats}
      />
    </>
  );
}

// Keep legacy export for backwards compatibility
export { GlobalSessionBar as MiniSessionBar };
