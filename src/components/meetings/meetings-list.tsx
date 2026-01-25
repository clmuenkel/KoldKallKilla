"use client";

import { useState } from "react";
import { useMeetings } from "@/hooks/use-meetings";
import { MeetingDetailDialog } from "./meeting-detail";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Building2,
  Plus,
  ChevronRight,
} from "lucide-react";
import { format, isPast, isToday, isFuture } from "date-fns";
import type { MeetingWithContact } from "@/types/database";

interface MeetingsListProps {
  contactId?: string;
  companyId?: string;
  userId: string;
  title?: string;
  showScheduleButton?: boolean;
  onScheduleClick?: () => void;
  limit?: number;
  compact?: boolean;
}

export function MeetingsList({
  contactId,
  companyId,
  userId,
  title = "Meetings",
  showScheduleButton = true,
  onScheduleClick,
  limit,
  compact = false,
}: MeetingsListProps) {
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);

  const { data: meetings, isLoading } = useMeetings({
    contactId,
    companyId,
    limit,
  });

  // Separate upcoming and past meetings
  const upcomingMeetings = meetings?.filter(
    (m) => m.status === "scheduled" && isFuture(new Date(m.scheduled_at))
  ) || [];
  
  const pastMeetings = meetings?.filter(
    (m) => m.status !== "scheduled" || isPast(new Date(m.scheduled_at))
  ) || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {title}
            </CardTitle>
            {showScheduleButton && onScheduleClick && (
              <Button size="sm" variant="outline" onClick={onScheduleClick}>
                <Plus className="h-4 w-4 mr-1" />
                Schedule
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {meetings && meetings.length > 0 ? (
            <div className="space-y-4">
              {/* Upcoming Meetings */}
              {upcomingMeetings.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Upcoming ({upcomingMeetings.length})
                  </p>
                  <div className="space-y-2">
                    {upcomingMeetings.map((meeting) => (
                      <MeetingCard
                        key={meeting.id}
                        meeting={meeting}
                        onClick={() => setSelectedMeetingId(meeting.id)}
                        compact={compact}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Past Meetings */}
              {pastMeetings.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Past ({pastMeetings.length})
                  </p>
                  <div className="space-y-2">
                    {pastMeetings.slice(0, compact ? 3 : undefined).map((meeting) => (
                      <MeetingCard
                        key={meeting.id}
                        meeting={meeting}
                        onClick={() => setSelectedMeetingId(meeting.id)}
                        compact={compact}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No meetings yet</p>
              {showScheduleButton && onScheduleClick && (
                <Button size="sm" variant="outline" className="mt-2" onClick={onScheduleClick}>
                  <Plus className="h-4 w-4 mr-1" />
                  Schedule Meeting
                </Button>
              )}
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

interface MeetingCardProps {
  meeting: MeetingWithContact;
  onClick: () => void;
  compact?: boolean;
}

function MeetingCard({ meeting, onClick, compact = false }: MeetingCardProps) {
  const contact = meeting.contacts;
  const isPastMeeting = isPast(new Date(meeting.scheduled_at));
  const isTodayMeeting = isToday(new Date(meeting.scheduled_at));

  const getStatusBadge = () => {
    if (meeting.status === "completed") {
      return <Badge variant="default" className="text-[10px]">Completed</Badge>;
    }
    if (meeting.status === "cancelled") {
      return <Badge variant="destructive" className="text-[10px]">Cancelled</Badge>;
    }
    if (isTodayMeeting) {
      return <Badge className="bg-blue-500 text-white text-[10px]">Today</Badge>;
    }
    if (isPastMeeting) {
      return <Badge variant="secondary" className="text-[10px]">Past Due</Badge>;
    }
    return null;
  };

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-colors hover:bg-muted group ${
        meeting.status === "cancelled" ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium text-sm truncate">{meeting.title}</p>
            {getStatusBadge()}
          </div>
          
          <p className="text-xs text-muted-foreground">
            {format(new Date(meeting.scheduled_at), "MMM d, yyyy 'at' h:mm a")}
          </p>

          {!compact && contact && (
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {contact.first_name} {contact.last_name}
              </span>
              {contact.company_name && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {contact.company_name}
                </span>
              )}
            </div>
          )}

          {!compact && (
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {meeting.duration_minutes}m
              </span>
              {meeting.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {meeting.location}
                </span>
              )}
            </div>
          )}
        </div>
        
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </div>
    </button>
  );
}
