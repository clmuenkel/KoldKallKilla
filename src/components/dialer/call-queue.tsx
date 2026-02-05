"use client";

import { useState, useMemo } from "react";
import { useDialerStore } from "@/stores/dialer-store";
import { useSessionCompletedContacts } from "@/hooks/use-calls";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { 
  Phone, 
  Check, 
  SkipForward, 
  AlertCircle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Star,
  Clock,
} from "lucide-react";
import {
  getContactTimezone,
  getTimezoneGroup,
  getTimezoneGroupShort,
  getBusinessHourStatus,
  getLocalTimeShort,
} from "@/lib/timezone";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const MAX_VISIBLE_UPCOMING = 10;

interface CallQueueProps {
  companiesById?: Map<string, { timezone?: string | null }>;
}

export function CallQueue({ companiesById }: CallQueueProps) {
  const [showCompleted, setShowCompleted] = useState(false);
  
  const { 
    queue, 
    currentIndex, 
    sessionStartTime,
    goToContact,
    skipContact,
  } = useDialerStore();

  // Get IDs for the database query
  const queueContactIds = useMemo(() => queue.map((c) => c.id), [queue]);

  // Query actual completed contacts from database (not position-based)
  const { data: completedIds } = useSessionCompletedContacts(sessionStartTime, queueContactIds);
  const completedIdsSet = completedIds ?? new Set<string>();

  // Database-based completion tracking
  const completedContacts = queue.filter((c) => completedIdsSet.has(c.id));
  const completedCount = completedContacts.length;
  const remainingCount = queue.length - completedCount;

  // Progress with overflow protection
  const progressPercent = queue.length > 0 
    ? Math.min((completedCount / queue.length) * 100, 100) 
    : 0;

  // Current contact and upcoming (excluding completed ones)
  const currentContact = queue[currentIndex];
  const upcomingContacts = queue.filter(
    (c, idx) => idx !== currentIndex && !completedIdsSet.has(c.id)
  );
  const visibleUpcoming = upcomingContacts.slice(0, MAX_VISIBLE_UPCOMING);
  const hiddenUpcomingCount = Math.max(0, upcomingContacts.length - MAX_VISIBLE_UPCOMING);

  return (
    <div className="flex flex-col h-full">
      {/* Header with Progress */}
      <div className="p-4 border-b bg-card/50 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">Call Queue</h3>
          <Badge variant="secondary" className="font-mono text-xs">
            {completedCount}/{queue.length}
          </Badge>
        </div>
        
        {/* Progress Bar */}
        <div className="space-y-1.5">
          <Progress value={progressPercent} className="h-2" />
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{completedCount} completed</span>
            <span>{remainingCount} remaining</span>
          </div>
        </div>
      </div>

      {/* Queue List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {/* Collapsed Completed Section */}
          {completedCount > 0 && (
            <div className="mb-2">
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="w-full flex items-center justify-between p-2 rounded-lg bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    {completedCount} completed
                  </span>
                </div>
                {showCompleted ? (
                  <ChevronUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                )}
              </button>
              
              {/* Expanded completed list */}
              {showCompleted && (
                <div className="mt-1 space-y-1 animate-in slide-in-from-top-2 duration-200">
                  {completedContacts.map((contact) => {
                    // Find the original index in the queue for navigation
                    const originalIndex = queue.findIndex((c) => c.id === contact.id);
                    return (
                      <ContactItem
                        key={contact.id}
                        contact={contact}
                        index={originalIndex}
                        isCurrent={currentIndex === originalIndex}
                        isPast={true}
                        onGoToContact={goToContact}
                        onSkipContact={skipContact}
                        companiesById={companiesById}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Current Contact - Always Visible */}
          {currentContact && (
            <div className="mb-2">
              {completedCount > 0 && !showCompleted && (
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-2 mb-1">
                  Current
                </div>
              )}
              <ContactItem
                contact={currentContact}
                index={currentIndex}
                isCurrent={true}
                isPast={completedIdsSet.has(currentContact.id)}
                onGoToContact={goToContact}
                onSkipContact={skipContact}
                companiesById={companiesById}
              />
            </div>
          )}

          {/* Upcoming Contacts - Capped at MAX_VISIBLE_UPCOMING */}
          {visibleUpcoming.length > 0 && (
            <div>
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-2 mb-1">
                Up Next ({upcomingContacts.length})
              </div>
              <div className="space-y-1">
                {visibleUpcoming.map((contact) => {
                  // Find the original index in the queue for navigation
                  const originalIndex = queue.findIndex((c) => c.id === contact.id);
                  return (
                    <ContactItem
                      key={contact.id}
                      contact={contact}
                      index={originalIndex}
                      isCurrent={false}
                      isPast={false}
                      onGoToContact={goToContact}
                      onSkipContact={skipContact}
                      companiesById={companiesById}
                    />
                  );
                })}
              </div>
              
              {/* Show more indicator */}
              {hiddenUpcomingCount > 0 && (
                <div className="mt-2 px-2 py-1.5 text-center text-xs text-muted-foreground bg-muted/30 rounded-lg">
                  +{hiddenUpcomingCount} more contacts below
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick Stats Footer */}
      <div className="p-3 border-t bg-card/50 shrink-0">
        <div className="flex items-center justify-around text-center">
          <div>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{completedCount}</p>
            <p className="text-[10px] text-muted-foreground">Done</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div>
            <p className="text-lg font-bold">{queue.length}</p>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div>
            <p className="text-lg font-bold text-primary">{remainingCount}</p>
            <p className="text-[10px] text-muted-foreground">Left</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Extracted contact item component for reuse
interface ContactItemProps {
  contact: {
    id: string;
    first_name: string;
    last_name?: string | null;
    phone?: string | null;
    mobile?: string | null;
    company_name?: string | null;
    company_id?: string | null;
    title?: string | null;
    is_aaa?: boolean;
    state?: string | null;
  };
  index: number;
  isCurrent: boolean;
  isPast: boolean;
  onGoToContact: (index: number) => void;
  onSkipContact: () => void;
  companiesById?: Map<string, { timezone?: string | null }>;
}

function ContactItem({ contact, index, isCurrent, isPast, onGoToContact, onSkipContact, companiesById }: ContactItemProps) {
  const hasPhone = !!contact.phone || !!contact.mobile;
  const isAAA = contact.is_aaa;
  
  // Timezone info - use company timezone when contact has no state
  const company = contact.company_id && companiesById ? companiesById.get(contact.company_id) : null;
  const timezone = getContactTimezone(contact, company);
  const tzGroup = getTimezoneGroup(timezone);
  const tzLabel = getTimezoneGroupShort(tzGroup);
  const tzStatus = getBusinessHourStatus(timezone);
  const localTime = getLocalTimeShort(timezone);

  return (
    <div
      className={cn(
        "group relative rounded-lg transition-all duration-200",
        isCurrent && "ring-2 ring-primary/50 shadow-lg shadow-primary/10",
        isAAA && !isCurrent && "ring-1 ring-amber-500/30"
      )}
    >
      <button
        onClick={() => onGoToContact(index)}
        className={cn(
          "w-full text-left p-3 rounded-lg transition-all duration-200",
          isCurrent
            ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground"
            : isPast
            ? isAAA 
              ? "bg-amber-500/5 hover:bg-amber-500/10"
              : "bg-muted/30 hover:bg-muted/50"
            : isAAA
            ? "bg-amber-500/5 hover:bg-amber-500/10"
            : hasPhone 
            ? "hover:bg-muted/70" 
            : "hover:bg-muted/50 opacity-60"
        )}
      >
        <div className="flex items-center gap-3">
          {/* Position/Status Indicator */}
          <div
            className={cn(
              "relative h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0",
              isCurrent
                ? "bg-white/20 text-primary-foreground"
                : isPast
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : hasPhone
                ? "bg-muted text-muted-foreground"
                : "bg-red-500/10 text-red-500"
            )}
          >
            {isPast ? (
              <Check className="h-4 w-4" />
            ) : !hasPhone ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <span>{index + 1}</span>
            )}
            
            {/* Pulse indicator for current contact */}
            {isCurrent && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
              </span>
            )}
          </div>

          {/* Contact Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {isAAA && (
                <Star className={cn(
                  "h-3.5 w-3.5 fill-amber-500 text-amber-500 shrink-0",
                  isCurrent && "fill-amber-300 text-amber-300"
                )} />
              )}
              <p className={cn(
                "font-medium truncate text-sm",
                isPast && !isCurrent && "line-through opacity-70"
              )}>
                {contact.first_name} {contact.last_name}
              </p>
            </div>
            <p
              className={cn(
                "text-xs truncate",
                isCurrent
                  ? "text-primary-foreground/70"
                  : "text-muted-foreground"
              )}
            >
              {contact.company_name || contact.title || "—"}
            </p>
          </div>

          {/* Status Icons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Timezone indicator */}
            {tzGroup !== "unknown" && (
              <div 
                className={cn(
                  "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
                  isCurrent 
                    ? "bg-white/20 text-primary-foreground"
                    : "bg-muted/70"
                )}
              >
                <span className={cn(
                  "h-1.5 w-1.5 rounded-full shrink-0",
                  tzStatus === "good" && "bg-emerald-500",
                  tzStatus === "borderline" && "bg-amber-500",
                  tzStatus === "bad" && "bg-red-500"
                )} />
                <span>{tzLabel}</span>
                {localTime && (
                  <span className="opacity-70">{localTime}</span>
                )}
              </div>
            )}
            {isCurrent && (
              <Phone className="h-4 w-4 animate-pulse" />
            )}
            {isPast && (
              <Badge 
                variant="secondary" 
                className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              >
                Done
              </Badge>
            )}
          </div>
        </div>
      </button>

      {/* Hover Actions - Slide in from right */}
      {!isCurrent && !isPast && (
        <div className={cn(
          "absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5",
          "opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0",
          "transition-all duration-200"
        )}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full bg-background/80 backdrop-blur-sm shadow-sm hover:bg-primary hover:text-primary-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  onGoToContact(index);
                }}
                aria-label="Jump to contact"
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Jump to contact</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full bg-background/80 backdrop-blur-sm shadow-sm hover:bg-slate-500 hover:text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  onGoToContact(index);
                  // Skip after a small delay to let the state update
                  requestAnimationFrame(() => {
                    onSkipContact();
                  });
                }}
                aria-label="Skip this contact"
              >
                <SkipForward className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Skip contact</TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  );
}
