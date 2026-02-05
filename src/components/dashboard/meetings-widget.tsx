"use client";

import { useState } from "react";
import { useTodaysMeetings, useUpcomingMeetings } from "@/hooks/use-meetings";
import { MeetingDetailDialog } from "@/components/meetings/meeting-detail";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  Clock,
  User,
  Building2,
  ChevronRight,
  CalendarDays,
} from "lucide-react";
import { format, isToday, isTomorrow, differenceInMinutes } from "date-fns";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { MeetingWithContact } from "@/types/database";

interface MeetingsWidgetProps {
  userId: string;
}

export function MeetingsWidget({ userId }: MeetingsWidgetProps) {
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  
  const { data: todaysMeetings, isLoading: loadingToday } = useTodaysMeetings();
  const { data: upcomingMeetings, isLoading: loadingUpcoming } = useUpcomingMeetings(7);

  // Filter out today's meetings from upcoming
  const nextUpMeetings = (upcomingMeetings ?? []).filter(
    (m) => !isToday(new Date(m.scheduled_at))
  ).slice(0, 3);

  const isLoading = loadingToday || loadingUpcoming;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Meetings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasMeetings = (todaysMeetings?.length ?? 0) > 0 || nextUpMeetings.length > 0;

  return (
    <>
      <Card variant="elevated">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Meetings
            </CardTitle>
            <Link href="/calendar">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                View All
                <ChevronRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {hasMeetings ? (
            <div className="space-y-4">
              {/* Today's Meetings */}
              {todaysMeetings && todaysMeetings.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    Today ({todaysMeetings.length})
                  </p>
                  <div className="space-y-2">
                    {todaysMeetings.map((meeting) => (
                      <MeetingItem
                        key={meeting.id}
                        meeting={meeting}
                        onClick={() => setSelectedMeetingId(meeting.id)}
                        showTimeUntil
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming Meetings */}
              {nextUpMeetings.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Coming Up
                  </p>
                  <div className="space-y-2">
                    {nextUpMeetings.map((meeting) => (
                      <MeetingItem
                        key={meeting.id}
                        meeting={meeting}
                        onClick={() => setSelectedMeetingId(meeting.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No upcoming meetings</p>
              <p className="text-xs text-muted-foreground mt-1">
                Schedule meetings from contact pages
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Meeting Detail Dialog */}
      {selectedMeetingId && (
        <MeetingDetailDialog
          meetingId={selectedMeetingId}
          userId={userId}
          open={!!selectedMeetingId}
          onOpenChange={(open) => !open && setSelectedMeetingId(null)}
        />
      )}
    </>
  );
}

interface MeetingItemProps {
  meeting: MeetingWithContact;
  onClick: () => void;
  showTimeUntil?: boolean;
}

function MeetingItem({ meeting, onClick, showTimeUntil = false }: MeetingItemProps) {
  const contact = meeting.contacts;
  const meetingDate = new Date(meeting.scheduled_at);
  const minutesUntil = differenceInMinutes(meetingDate, new Date());
  
  const getTimeLabel = () => {
    if (showTimeUntil && minutesUntil > 0 && minutesUntil < 60) {
      return `In ${minutesUntil} min`;
    }
    if (showTimeUntil && minutesUntil <= 0 && minutesUntil > -60) {
      return "Now";
    }
    if (isTomorrow(meetingDate)) {
      return `Tomorrow ${format(meetingDate, "h:mm a")}`;
    }
    return format(meetingDate, "MMM d, h:mm a");
  };

  const isHappeningSoon = showTimeUntil && minutesUntil > 0 && minutesUntil <= 30;
  const isHappeningNow = showTimeUntil && minutesUntil <= 0 && minutesUntil > -60;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-3 rounded-lg border transition-colors hover:bg-muted",
        isHappeningNow && "bg-green-500/5 dark:bg-green-500/10 border-green-500/30",
        isHappeningSoon && !isHappeningNow && "bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/30"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{meeting.title}</p>
          {contact && (
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
              <User className="h-3 w-3 shrink-0" />
              {contact.first_name} {contact.last_name}
              {contact.company_name && (
                <>
                  <span className="mx-1">•</span>
                  <Building2 className="h-3 w-3 shrink-0" />
                  {contact.company_name}
                </>
              )}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <Badge 
            variant={isHappeningNow ? "default" : isHappeningSoon ? "secondary" : "outline"} 
            className={`text-[10px] ${
              isHappeningNow ? "bg-green-500" : isHappeningSoon ? "bg-amber-500 text-white" : ""
            }`}
          >
            {getTimeLabel()}
          </Badge>
          <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center justify-end gap-1">
            <Clock className="h-3 w-3" />
            {meeting.duration_minutes}m
          </p>
        </div>
      </div>
    </button>
  );
}
