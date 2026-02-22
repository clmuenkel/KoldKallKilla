"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { useUpcomingMeetings, useTodaysMeetings, useCancelMeeting, useCompleteMeeting } from "@/hooks/use-meetings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Calendar,
  Clock,
  MapPin,
  Link as LinkIcon,
  User,
  Building2,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle,
  Loader2,
  Plus,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  isSameDay, 
  isToday, 
  isPast, 
  addMonths, 
  subMonths,
  isSameMonth 
} from "date-fns";
import { toast } from "sonner";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { CreateMeetingDialog } from "@/components/meetings/create-meeting-dialog";
import { useAuthId } from "@/hooks/use-auth";
import type { MeetingWithContact } from "@/types/database";

export default function CalendarPage() {
  const userId = useAuthId();
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingWithContact | null>(null);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [completionOutcome, setCompletionOutcome] = useState("successful");
  const [completionNotes, setCompletionNotes] = useState("");
  const [createMeetingOpen, setCreateMeetingOpen] = useState(false);

  const { data: upcomingMeetings, isLoading } = useUpcomingMeetings(60); // Get 60 days of meetings
  const { data: todaysMeetings } = useTodaysMeetings();
  const cancelMeeting = useCancelMeeting();
  const completeMeeting = useCompleteMeeting();

  if (!userId) return null;

  // Generate calendar days for the month view
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday start
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  // Generate all days to display in the calendar grid
  const calendarDays: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    calendarDays.push(day);
    day = addDays(day, 1);
  }

  // Combine and dedupe meetings
  const todayMeetingsList = todaysMeetings ?? [];
  const upcomingMeetingsList = upcomingMeetings ?? [];
  const allMeetings = [...todayMeetingsList, ...upcomingMeetingsList];
  
  const seenIds = new Set<string>();
  const uniqueMeetings = allMeetings.filter((m) => {
    if (seenIds.has(m.id)) return false;
    seenIds.add(m.id);
    return true;
  });
  
  const getMeetingsForDate = (date: Date) => {
    return uniqueMeetings.filter((m) => 
      isSameDay(new Date(m.scheduled_at), date)
    );
  };

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handleToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  const handleCancelMeeting = async (meetingId: string) => {
    try {
      await cancelMeeting.mutateAsync(meetingId);
      toast.success("Meeting cancelled");
      setSelectedMeeting(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel meeting");
    }
  };

  const handleCompleteMeeting = async () => {
    if (!selectedMeeting) return;
    
    try {
      await completeMeeting.mutateAsync({
        id: selectedMeeting.id,
        outcome: completionOutcome,
        notes: completionNotes,
      });
      toast.success("Meeting marked as complete");
      setShowCompleteDialog(false);
      setSelectedMeeting(null);
      setCompletionOutcome("successful");
      setCompletionNotes("");
    } catch (error: any) {
      toast.error(error.message || "Failed to complete meeting");
    }
  };

  // Get meetings for selected date (sidebar)
  const selectedDateMeetings = selectedDate ? getMeetingsForDate(selectedDate) : todayMeetingsList;
  const sidebarTitle = selectedDate 
    ? (isToday(selectedDate) ? "Today's Schedule" : format(selectedDate, "MMM d, yyyy"))
    : "Today's Schedule";

  // Day names header
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="flex flex-col h-full">
      <Header title="Calendar" />
      
      <div className="flex-1 p-6 overflow-hidden">
        <div className="flex gap-6 h-full">
          {/* Main Calendar - Month View */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={handlePrevMonth} aria-label="Previous month">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Previous month</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={handleNextMonth} aria-label="Next month">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Next month</TooltipContent>
                </Tooltip>
                <Button variant="outline" size="sm" onClick={handleToday}>
                  Today
                </Button>
              </div>
              <h2 className="text-xl font-semibold">
                {format(currentMonth, "MMMM yyyy")}
              </h2>
              <div className="w-32" /> {/* Spacer for balance */}
            </div>

            {/* Day Names Header */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {dayNames.map((dayName) => (
                <div
                  key={dayName}
                  className="text-center text-xs font-medium text-muted-foreground py-2"
                >
                  {dayName}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 grid grid-cols-7 gap-1 auto-rows-fr">
              {calendarDays.map((calDay) => {
                const dayMeetings = getMeetingsForDate(calDay);
                const isCurrentDay = isToday(calDay);
                const isCurrentMonth = isSameMonth(calDay, currentMonth);
                const isSelected = selectedDate && isSameDay(calDay, selectedDate);
                const hasMeetings = dayMeetings.length > 0;

                return (
                  <button
                    key={calDay.toISOString()}
                    onClick={() => setSelectedDate(calDay)}
                    className={cn(
                      "relative flex flex-col items-center p-1 rounded-lg border transition-all min-h-[60px]",
                      isCurrentMonth ? "bg-card" : "bg-muted/30 opacity-50",
                      isCurrentDay ? "border-primary ring-1 ring-primary/50" : "border-transparent hover:border-border",
                      isSelected ? "bg-primary/10 border-primary" : "hover:bg-muted/50"
                    )}
                  >
                    {/* Day Number */}
                    <span className={cn(
                      "text-sm font-medium",
                      isCurrentDay ? "text-primary" : isCurrentMonth ? "" : "text-muted-foreground"
                    )}>
                      {format(calDay, "d")}
                    </span>

                    {/* Meeting Indicators */}
                    {hasMeetings && (
                      <div className="flex flex-wrap gap-0.5 justify-center mt-1 max-w-full">
                        {dayMeetings.slice(0, 3).map((meeting) => (
                          <div
                            key={meeting.id}
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              meeting.status === "cancelled" && "bg-muted-foreground",
                              meeting.status === "completed" && "bg-green-500",
                              meeting.status !== "cancelled" && meeting.status !== "completed" && isPast(new Date(meeting.scheduled_at)) && "bg-amber-500",
                              meeting.status !== "cancelled" && meeting.status !== "completed" && !isPast(new Date(meeting.scheduled_at)) && "bg-primary"
                            )}
                            title={meeting.title}
                          />
                        ))}
                        {dayMeetings.length > 3 && (
                          <span className="text-[8px] text-muted-foreground">
                            +{dayMeetings.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Meeting count for days with meetings */}
                    {hasMeetings && (
                      <span className="text-[10px] text-muted-foreground mt-auto">
                        {dayMeetings.length} {dayMeetings.length === 1 ? "meeting" : "meetings"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Date Meetings Sidebar */}
          <div className="w-80 shrink-0">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3 shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {sidebarTitle}
                  </CardTitle>
                  <Button size="sm" variant="outline" onClick={() => setCreateMeetingOpen(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Schedule
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  {isLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                  ) : selectedDateMeetings.length > 0 ? (
                    <div className="space-y-3 pr-2">
                      {selectedDateMeetings.map((meeting) => (
                        <MeetingCard
                          key={meeting.id}
                          meeting={meeting}
                          onClick={() => setSelectedMeeting(meeting)}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={Calendar}
                      title={selectedDate 
                        ? `No meetings on ${format(selectedDate, "MMM d")}`
                        : "No meetings today"
                      }
                      className="py-8"
                    />
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Meeting Detail Dialog */}
      <Dialog open={!!selectedMeeting && !showCompleteDialog} onOpenChange={(open) => !open && setSelectedMeeting(null)}>
        <DialogContent className="sm:max-w-[500px]">
          {selectedMeeting && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedMeeting.title}</DialogTitle>
                <DialogDescription>
                  {format(new Date(selectedMeeting.scheduled_at), "EEEE, MMMM d, yyyy 'at' h:mm a")}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Contact Info */}
                {selectedMeeting.contacts && (
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {selectedMeeting.contacts.first_name} {selectedMeeting.contacts.last_name}
                      </p>
                      {selectedMeeting.contacts.title && (
                        <p className="text-sm text-muted-foreground">
                          {selectedMeeting.contacts.title}
                        </p>
                      )}
                      {selectedMeeting.contacts.company_name && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {selectedMeeting.contacts.company_name}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Meeting Details */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedMeeting.duration_minutes} minutes</span>
                  </div>

                  {selectedMeeting.location && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedMeeting.location}</span>
                    </div>
                  )}

                  {selectedMeeting.meeting_link && (
                    <div className="flex items-center gap-2 text-sm">
                      <LinkIcon className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={selectedMeeting.meeting_link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Join Meeting
                      </a>
                    </div>
                  )}

                  {selectedMeeting.description && (
                    <div className="pt-2">
                      <p className="text-sm text-muted-foreground">
                        {selectedMeeting.description}
                      </p>
                    </div>
                  )}
                </div>

                {/* Status Badge */}
                <div>
                  <Badge variant={
                    selectedMeeting.status === "completed" ? "default" :
                    selectedMeeting.status === "cancelled" ? "destructive" :
                    isPast(new Date(selectedMeeting.scheduled_at)) ? "secondary" : "outline"
                  }>
                    {selectedMeeting.status === "completed" ? "Completed" :
                     selectedMeeting.status === "cancelled" ? "Cancelled" :
                     isPast(new Date(selectedMeeting.scheduled_at)) ? "Past Due" : "Scheduled"}
                  </Badge>
                </div>
              </div>

              <DialogFooter className="gap-2">
                {selectedMeeting.status === "scheduled" && (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => handleCancelMeeting(selectedMeeting.id)}
                      disabled={cancelMeeting.isPending}
                    >
                      {cancelMeeting.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <X className="h-4 w-4 mr-2" />
                      )}
                      Cancel
                    </Button>
                    <Button onClick={() => setShowCompleteDialog(true)}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark Complete
                    </Button>
                  </>
                )}
                {selectedMeeting.contacts && (
                  <Button variant="outline" asChild>
                    <Link href={`/contacts/${selectedMeeting.contact_id}`}>
                      View Contact
                    </Link>
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Complete Meeting Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Meeting</DialogTitle>
            <DialogDescription>
              How did the meeting go?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Outcome</Label>
              <Select value={completionOutcome} onValueChange={setCompletionOutcome}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="successful">Successful - Good meeting</SelectItem>
                  <SelectItem value="follow_up_needed">Follow-up needed</SelectItem>
                  <SelectItem value="no_show">No show</SelectItem>
                  <SelectItem value="rescheduled">Rescheduled</SelectItem>
                  <SelectItem value="not_interested">Not interested</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="What was discussed? Any action items?"
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCompleteMeeting} disabled={completeMeeting.isPending}>
              {completeMeeting.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateMeetingDialog
        open={createMeetingOpen}
        onOpenChange={setCreateMeetingOpen}
        userId={userId}
      />
    </div>
  );
}

function MeetingCard({
  meeting,
  onClick,
}: {
  meeting: MeetingWithContact;
  onClick: () => void;
}) {
  const contact = meeting.contacts;
  const isPastMeeting = isPast(new Date(meeting.scheduled_at));

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-3 rounded-lg border transition-colors",
        meeting.status === "cancelled" && "opacity-50 line-through",
        meeting.status === "completed" && "border-green-500/30 bg-green-500/5 dark:bg-green-500/10",
        meeting.status !== "cancelled" && meeting.status !== "completed" && isPastMeeting && "border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10",
        meeting.status !== "cancelled" && meeting.status !== "completed" && !isPastMeeting && "bg-card hover:bg-muted"
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <p className="font-medium text-sm truncate">{meeting.title}</p>
        <Badge variant="outline" className="text-[10px] shrink-0">
          {format(new Date(meeting.scheduled_at), "h:mm a")}
        </Badge>
      </div>
      {contact && (
        <p className="text-xs text-muted-foreground truncate">
          {contact.first_name} {contact.last_name}
          {contact.company_name && ` • ${contact.company_name}`}
        </p>
      )}
      <div className="flex items-center gap-2 mt-1">
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {meeting.duration_minutes}m
        </span>
        {meeting.location && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {meeting.location}
          </span>
        )}
        {meeting.status === "completed" && (
          <Badge variant="default" className="text-[8px] px-1 py-0">
            Done
          </Badge>
        )}
      </div>
    </button>
  );
}
