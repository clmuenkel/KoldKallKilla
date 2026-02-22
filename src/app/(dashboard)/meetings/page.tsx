"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { PageHeader } from "@/components/layout/page-header";
import { useAllMeetings } from "@/hooks/use-meetings";
import { MeetingDetailDialog } from "@/components/meetings/meeting-detail";
import { Button } from "@/components/ui/button";
import { Badge, MeetingStatusBadge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Clock,
  User,
  Building2,
  ChevronRight,
  Search,
  Plus,
} from "lucide-react";
import { CreateMeetingDialog } from "@/components/meetings/create-meeting-dialog";
import { Input } from "@/components/ui/input";
import { format, isPast, isFuture, isToday } from "date-fns";
import { useAuthId } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import type { MeetingWithContact } from "@/types/database";

type FilterTab = "all" | "upcoming" | "past" | "completed";

export default function MeetingsPage() {
  const userId = useAuthId();
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [createMeetingOpen, setCreateMeetingOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: allMeetings, isLoading } = useAllMeetings();

  if (!userId) return null;

  // Filter meetings based on active tab
  const filteredMeetings = (allMeetings ?? []).filter((meeting) => {
    const meetingDate = new Date(meeting.scheduled_at);
    
    // Apply tab filter
    let matchesTab = true;
    switch (activeFilter) {
      case "upcoming":
        matchesTab = meeting.status === "scheduled" && isFuture(meetingDate);
        break;
      case "past":
        matchesTab = isPast(meetingDate) && meeting.status !== "completed";
        break;
      case "completed":
        matchesTab = meeting.status === "completed";
        break;
      default:
        matchesTab = true;
    }

    // Apply search filter
    const contact = meeting.contacts;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      meeting.title.toLowerCase().includes(searchLower) ||
      contact?.first_name?.toLowerCase().includes(searchLower) ||
      contact?.last_name?.toLowerCase().includes(searchLower) ||
      contact?.company_name?.toLowerCase().includes(searchLower);

    return matchesTab && matchesSearch;
  }) || [];

  // Get counts for tabs
  const counts = {
    all: allMeetings?.length || 0,
    upcoming: allMeetings?.filter(m => m.status === "scheduled" && isFuture(new Date(m.scheduled_at))).length || 0,
    past: allMeetings?.filter(m => isPast(new Date(m.scheduled_at)) && m.status !== "completed").length || 0,
    completed: allMeetings?.filter(m => m.status === "completed").length || 0,
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Meetings" />

      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <PageHeader
          title="All Meetings"
          description="View and manage your scheduled meetings"
          actions={
            <div className="flex items-center gap-2">
              <Button onClick={() => setCreateMeetingOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Schedule meeting
              </Button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search meetings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
            </div>
          }
        />

        {/* Filter Tabs */}
        <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as FilterTab)}>
          <TabsList>
            <TabsTrigger value="all" className="gap-2">
              All
              <Badge variant="secondary" className="text-xs">{counts.all}</Badge>
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="gap-2">
              Upcoming
              <Badge variant="secondary" className="text-xs">{counts.upcoming}</Badge>
            </TabsTrigger>
            <TabsTrigger value="past" className="gap-2">
              Past
              <Badge variant="secondary" className="text-xs">{counts.past}</Badge>
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2">
              Completed
              <Badge variant="secondary" className="text-xs">{counts.completed}</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Meetings List */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : filteredMeetings.length > 0 ? (
          <div className="space-y-2">
            {filteredMeetings.map((meeting) => (
              <MeetingRow
                key={meeting.id}
                meeting={meeting}
                onClick={() => setSelectedMeetingId(meeting.id)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Calendar}
            title={searchQuery ? "No meetings match your search" : "No meetings found"}
            description={searchQuery ? "Try adjusting your search terms" : "Schedule a meeting using the button above, or from the dialer or contact page"}
          />
        )}
      </div>

      {/* Meeting Detail Dialog */}
      {selectedMeetingId && (
        <MeetingDetailDialog
          meetingId={selectedMeetingId}
          userId={userId}
          open={!!selectedMeetingId}
          onOpenChange={(open) => !open && setSelectedMeetingId(null)}
        />
      )}

      {/* Create Meeting Dialog */}
      <CreateMeetingDialog
        open={createMeetingOpen}
        onOpenChange={setCreateMeetingOpen}
        userId={userId}
      />
    </div>
  );
}

interface MeetingRowProps {
  meeting: MeetingWithContact;
  onClick: () => void;
}

function MeetingRow({ meeting, onClick }: MeetingRowProps) {
  const contact = meeting.contacts;
  const meetingDate = new Date(meeting.scheduled_at);
  const isPastMeeting = isPast(meetingDate);
  const isTodayMeeting = isToday(meetingDate);

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-4 rounded-lg border bg-card transition-colors hover:bg-muted group",
        meeting.status === "cancelled" && "opacity-50"
      )}
    >
      <div className="flex items-center gap-4">
        {/* Date Column */}
        <div className="w-20 shrink-0 text-center">
          <p className="text-2xl font-bold">{format(meetingDate, "d")}</p>
          <p className="text-xs text-muted-foreground uppercase">
            {format(meetingDate, "MMM yyyy")}
          </p>
        </div>

        {/* Divider */}
        <div className="w-px h-12 bg-border" />

        {/* Meeting Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold truncate">{meeting.title}</p>
            <MeetingStatusBadge 
              status={meeting.status as "scheduled" | "completed" | "cancelled"} 
              isToday={isTodayMeeting}
              isPast={isPastMeeting}
            />
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {format(meetingDate, "h:mm a")} • {meeting.duration_minutes}min
            </span>

            {contact && (
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {contact.first_name} {contact.last_name}
              </span>
            )}

            {contact?.company_name && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {contact.company_name}
              </span>
            )}
          </div>

          {meeting.status === "completed" && meeting.outcome && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              Outcome: {meeting.outcome}
            </p>
          )}
        </div>

        {/* Arrow */}
        <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </div>
    </button>
  );
}
