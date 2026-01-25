"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Phone, 
  PhoneOff, 
  PhoneMissed,
  PhoneIncoming,
  Clock,
  User,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import Link from "next/link";
import type { CallWithContact } from "@/types/database";

interface CompanyCallHistoryProps {
  calls: CallWithContact[];
  isLoading?: boolean;
  maxHeight?: string;
}

export function CompanyCallHistory({ 
  calls, 
  isLoading,
  maxHeight = "400px" 
}: CompanyCallHistoryProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (!calls || calls.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No calls recorded for this company yet.
      </div>
    );
  }

  return (
    <ScrollArea className="pr-4" style={{ maxHeight }}>
      <div className="space-y-3">
        {calls.map((call) => (
          <CallHistoryItem key={call.id} call={call} />
        ))}
      </div>
    </ScrollArea>
  );
}

function CallHistoryItem({ call }: { call: CallWithContact }) {
  const outcomeConfig = getOutcomeConfig(call.outcome);
  const duration = call.duration_seconds 
    ? formatDuration(call.duration_seconds)
    : null;
  
  const contactName = call.contacts 
    ? `${call.contacts.first_name} ${call.contacts.last_name || ""}`.trim()
    : "Unknown";

  return (
    <div className="flex gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      {/* Icon */}
      <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${outcomeConfig.bgColor}`}>
        <outcomeConfig.icon className={`h-5 w-5 ${outcomeConfig.iconColor}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Link 
              href={`/contacts/${call.contact_id}`}
              className="font-medium hover:underline truncate"
            >
              {contactName}
            </Link>
            {call.contacts?.title && (
              <span className="text-xs text-muted-foreground truncate">
                ({call.contacts.title})
              </span>
            )}
          </div>
          <Badge variant={outcomeConfig.variant as any} className="shrink-0">
            {call.outcome.replace(/_/g, " ")}
          </Badge>
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {format(new Date(call.started_at), "MMM d, h:mm a")}
          </span>
          {duration && (
            <span>{duration}</span>
          )}
          <span>
            {formatDistanceToNow(new Date(call.started_at), { addSuffix: true })}
          </span>
        </div>

        {/* Notes preview */}
        {call.notes && (
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
            {call.notes}
          </p>
        )}
      </div>
    </div>
  );
}

function getOutcomeConfig(outcome: string) {
  switch (outcome) {
    case "connected":
      return {
        icon: Phone,
        bgColor: "bg-green-100 dark:bg-green-900/30",
        iconColor: "text-green-600",
        variant: "success",
      };
    case "voicemail":
      return {
        icon: PhoneIncoming,
        bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
        iconColor: "text-yellow-600",
        variant: "warning",
      };
    case "no_answer":
      return {
        icon: PhoneMissed,
        bgColor: "bg-orange-100 dark:bg-orange-900/30",
        iconColor: "text-orange-600",
        variant: "secondary",
      };
    case "callback_scheduled":
      return {
        icon: Phone,
        bgColor: "bg-blue-100 dark:bg-blue-900/30",
        iconColor: "text-blue-600",
        variant: "default",
      };
    case "not_interested":
    case "bad_number":
      return {
        icon: PhoneOff,
        bgColor: "bg-red-100 dark:bg-red-900/30",
        iconColor: "text-red-600",
        variant: "destructive",
      };
    default:
      return {
        icon: Phone,
        bgColor: "bg-gray-100 dark:bg-gray-900/30",
        iconColor: "text-gray-600",
        variant: "outline",
      };
  }
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) {
    return `${secs}s`;
  }
  return `${mins}m ${secs}s`;
}

// Compact version for sidebar/panel
export function CompanyCallHistoryCompact({ 
  calls, 
  limit = 3 
}: { 
  calls: CallWithContact[]; 
  limit?: number;
}) {
  if (!calls || calls.length === 0) {
    return null;
  }

  const recentCalls = calls.slice(0, limit);

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">
        Recent Calls at Company
      </p>
      {recentCalls.map((call) => {
        const outcomeConfig = getOutcomeConfig(call.outcome);
        const contactName = call.contacts 
          ? `${call.contacts.first_name}`
          : "Unknown";

        return (
          <div 
            key={call.id}
            className="flex items-center gap-2 text-sm"
          >
            <outcomeConfig.icon className={`h-4 w-4 ${outcomeConfig.iconColor}`} />
            <span className="font-medium">{contactName}</span>
            <span className="text-muted-foreground">
              {formatDistanceToNow(new Date(call.started_at), { addSuffix: true })}
            </span>
          </div>
        );
      })}
      {calls.length > limit && (
        <p className="text-xs text-muted-foreground">
          +{calls.length - limit} more calls
        </p>
      )}
    </div>
  );
}
