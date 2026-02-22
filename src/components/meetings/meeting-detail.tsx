"use client";

import { useState, useEffect } from "react";
import { useMeeting, useUpdateMeeting, useSetMeetingAttendees, useCancelMeeting, useCompleteMeeting } from "@/hooks/use-meetings";
import { useContacts } from "@/hooks/use-contacts";
import { MeetingNotes } from "./meeting-notes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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
  X,
  CheckCircle,
  Loader2,
  ExternalLink,
  Pencil,
  Maximize2,
  Minimize2,
  Bell,
  Users,
} from "lucide-react";
import { ContactCombobox } from "@/components/ui/contact-combobox";
import { ContactMultiSelect } from "@/components/ui/contact-multi-select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, isPast, addMinutes, differenceInMinutes } from "date-fns";
import Link from "next/link";
import type { MeetingWithContact } from "@/types/database";

const DURATION_OPTIONS = [
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "45", label: "45 minutes" },
  { value: "60", label: "1 hour" },
  { value: "90", label: "1.5 hours" },
  { value: "120", label: "2 hours" },
];

const REMINDER_OPTIONS = [
  { value: "0", label: "No reminder" },
  { value: "5", label: "5 minutes before" },
  { value: "15", label: "15 minutes before" },
  { value: "30", label: "30 minutes before" },
  { value: "60", label: "1 hour before" },
  { value: "1440", label: "1 day before" },
];

const TIME_SLOTS = (() => {
  const slots: { value: string; label: string }[] = [];
  for (let hour = 6; hour <= 21; hour++) {
    for (let min = 0; min < 60; min += 15) {
      const time = `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const ampm = hour >= 12 ? "PM" : "AM";
      slots.push({ value: time, label: `${displayHour}:${min.toString().padStart(2, "0")} ${ampm}` });
    }
  }
  return slots;
})();

interface MeetingDetailProps {
  meetingId: string;
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MeetingDetailDialog({
  meetingId,
  userId,
  open,
  onOpenChange,
}: MeetingDetailProps) {
  const { data: meeting, isLoading, isError, error } = useMeeting(meetingId);
  const { data: contacts } = useContacts();
  const updateMeeting = useUpdateMeeting();
  const setMeetingAttendees = useSetMeetingAttendees();
  const cancelMeeting = useCancelMeeting();
  const completeMeeting = useCompleteMeeting();

  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [completionOutcome, setCompletionOutcome] = useState("successful");
  const [completionNotes, setCompletionNotes] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [isEditingMeeting, setIsEditingMeeting] = useState(false);
  const [editContactId, setEditContactId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("10:00");
  const [editDuration, setEditDuration] = useState("30");
  const [editLocation, setEditLocation] = useState("");
  const [editMeetingLink, setEditMeetingLink] = useState("");
  const [editReminder, setEditReminder] = useState("15");
  const [editDescription, setEditDescription] = useState("");
  const [editAdditionalAttendeeIds, setEditAdditionalAttendeeIds] = useState<string[]>([]);

  useEffect(() => {
    if (meeting && isEditingMeeting) {
      setEditContactId(meeting.contact_id);
      setEditTitle(meeting.title);
      const d = new Date(meeting.scheduled_at);
      setEditDate(format(d, "yyyy-MM-dd"));
      setEditTime(format(d, "HH:mm"));
      setEditDuration(String(meeting.duration_minutes));
      setEditLocation(meeting.location ?? "");
      setEditMeetingLink(meeting.meeting_link ?? "");
      setEditDescription(meeting.description ?? "");
      if (meeting.reminder_at) {
        const scheduled = new Date(meeting.scheduled_at);
        const reminder = new Date(meeting.reminder_at);
        const minsBefore = differenceInMinutes(scheduled, reminder);
        const match = REMINDER_OPTIONS.find((o) => parseInt(o.value) === minsBefore) ?? REMINDER_OPTIONS[2];
        setEditReminder(match.value);
      } else {
        setEditReminder("0");
      }
      setEditAdditionalAttendeeIds(
        meeting.meeting_attendees?.map((a) => a.contact_id) ?? []
      );
    }
  }, [meeting, isEditingMeeting]);

  const handleSaveTitle = async () => {
    const trimmed = editTitleValue.trim();
    if (!trimmed || trimmed === meeting.title) {
      setIsEditingTitle(false);
      setEditTitleValue("");
      return;
    }
    try {
      await updateMeeting.mutateAsync({ id: meetingId, updates: { title: trimmed } });
      toast.success("Meeting name updated");
      setIsEditingTitle(false);
      setEditTitleValue("");
    } catch (error: any) {
      toast.error(error.message || "Failed to update meeting name");
    }
  };

  const handleSaveMeeting = async () => {
    const primaryContact = contacts?.find((c) => c.id === editContactId);
    if (!editContactId || !primaryContact) {
      toast.error("Please select a primary contact");
      return;
    }
    if (!editTitle.trim() || !editDate || !editTime) {
      toast.error("Please fill in title, date, and time");
      return;
    }
    const [hours, minutes] = editTime.split(":").map(Number);
    const [y, mo, d] = editDate.split("-").map(Number);
    const scheduledDate = new Date(y, mo - 1, d, hours, minutes, 0, 0);
    const reminderMinutes = parseInt(editReminder);
    const reminderAt =
      reminderMinutes > 0 ? addMinutes(scheduledDate, -reminderMinutes).toISOString() : null;

    try {
      await updateMeeting.mutateAsync({
        id: meetingId,
        updates: {
          contact_id: editContactId,
          company_id: primaryContact.company_id ?? null,
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          scheduled_at: scheduledDate.toISOString(),
          duration_minutes: parseInt(editDuration),
          location: editLocation.trim() || null,
          meeting_link: editMeetingLink.trim() || null,
          reminder_at: reminderAt,
        },
      });
      await setMeetingAttendees.mutateAsync({
        meetingId,
        primaryContactId: editContactId,
        additionalAttendeeIds: editAdditionalAttendeeIds,
      });
      toast.success("Meeting updated");
      setIsEditingMeeting(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update meeting");
    }
  };

  const handleCancel = async () => {
    try {
      await cancelMeeting.mutateAsync(meetingId);
      toast.success("Meeting cancelled");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel meeting");
    }
  };

  const handleComplete = async () => {
    try {
      await completeMeeting.mutateAsync({
        id: meetingId,
        outcome: completionOutcome,
        notes: completionNotes,
      });
      toast.success("Meeting marked as complete");
      setShowCompleteDialog(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to complete meeting");
    }
  };

  if (isLoading || !meeting) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          {isError ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-destructive font-medium">Could not load meeting</p>
              <p className="text-sm text-muted-foreground">{error?.message ?? "Unknown error"}</p>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  const contact = meeting.contacts;
  const isPastMeeting = isPast(new Date(meeting.scheduled_at));

  return (
    <>
      <Dialog open={open && !showCompleteDialog} onOpenChange={onOpenChange}>
        <DialogContent className={cn(
          "max-h-[90vh] overflow-y-auto transition-all duration-200",
          isFullscreen 
            ? "sm:max-w-[95vw] h-[95vh]" 
            : "sm:max-w-[600px]"
        )}>
          <DialogHeader>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0 pr-2">
                {isEditingTitle ? (
                  <div className="space-y-1">
                    <Input
                      value={editTitleValue}
                      onChange={(e) => setEditTitleValue(e.target.value)}
                      onBlur={handleSaveTitle}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveTitle();
                        if (e.key === "Escape") {
                          setIsEditingTitle(false);
                          setEditTitleValue("");
                        }
                      }}
                      placeholder="Meeting name"
                      className="text-xl font-semibold h-9"
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground">Press Enter to save, Escape to cancel</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 group">
                    <DialogTitle className="text-xl truncate">{meeting.title}</DialogTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        setEditTitleValue(meeting.title);
                        setIsEditingTitle(true);
                      }}
                      aria-label="Edit meeting name"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <DialogDescription className="mt-1">
                  {format(new Date(meeting.scheduled_at), "EEEE, MMMM d, yyyy 'at' h:mm a")}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!isEditingMeeting && meeting.status !== "cancelled" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingMeeting(true)}
                    className="gap-1"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit meeting
                  </Button>
                )}
                <Badge
                  variant={
                    meeting.status === "completed"
                      ? "default"
                      : meeting.status === "cancelled"
                      ? "destructive"
                      : isPastMeeting
                      ? "secondary"
                      : "outline"
                  }
                >
                  {meeting.status === "completed"
                    ? "Completed"
                    : meeting.status === "cancelled"
                    ? "Cancelled"
                    : isPastMeeting
                    ? "Past Due"
                    : "Scheduled"}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </DialogHeader>

          {isEditingMeeting ? (
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Primary contact *
                </Label>
                <ContactCombobox
                  contacts={contacts}
                  value={editContactId}
                  onValueChange={setEditContactId}
                  placeholder="Search and select a contact..."
                />
              </div>
              <div className="space-y-2">
                <Label>Meeting title *</Label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Meeting name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Time *</Label>
                  <Select value={editTime} onValueChange={setEditTime}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {TIME_SLOTS.map((slot) => (
                        <SelectItem key={slot.value} value={slot.value}>
                          {slot.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Duration
                  </Label>
                  <Select value={editDuration} onValueChange={setEditDuration}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Bell className="h-3 w-3" />
                    Reminder
                  </Label>
                  <Select value={editReminder} onValueChange={setEditReminder}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REMINDER_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Location (optional)
                </Label>
                <Input
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  placeholder="Office, Zoom, etc."
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <LinkIcon className="h-3 w-3" />
                  Meeting link (optional)
                </Label>
                <Input
                  value={editMeetingLink}
                  onChange={(e) => setEditMeetingLink(e.target.value)}
                  placeholder="https://zoom.us/j/..."
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Add attendees (optional)
                </Label>
                <ContactMultiSelect
                  contacts={contacts}
                  value={editAdditionalAttendeeIds}
                  onValueChange={setEditAdditionalAttendeeIds}
                  placeholder="Add other people..."
                  excludeIds={editContactId ? [editContactId] : []}
                />
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Agenda, topics..."
                  rows={3}
                />
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setIsEditingMeeting(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveMeeting}
                  disabled={updateMeeting.isPending || setMeetingAttendees.isPending}
                >
                  {(updateMeeting.isPending || setMeetingAttendees.isPending) ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Pencil className="h-4 w-4 mr-2" />
                  )}
                  Save changes
                </Button>
              </DialogFooter>
            </div>
          ) : (
          <>
          <div className="space-y-6 py-4">
            {/* Contact Info (primary) */}
            {contact && (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <User className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">
                    {contact.first_name} {contact.last_name}
                  </p>
                  {contact.title && (
                    <p className="text-sm text-muted-foreground">{contact.title}</p>
                  )}
                  {contact.company_name && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {contact.company_name}
                    </p>
                  )}
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/contacts/${contact.id}`}>
                    View <ExternalLink className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </div>
            )}

            {/* Other attendees */}
            {meeting.meeting_attendees?.length ? (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Other attendees</Label>
                <div className="space-y-1.5">
                  {meeting.meeting_attendees.map(
                    (att) =>
                      att.contacts && (
                        <div
                          key={att.contact_id}
                          className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                        >
                          <User className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <Link
                              href={`/contacts/${att.contact_id}`}
                              className="font-medium text-sm hover:underline text-primary"
                            >
                              {att.contacts.first_name} {att.contacts.last_name}
                            </Link>
                            {att.contacts.company_name && (
                              <p className="text-xs text-muted-foreground">
                                {att.contacts.company_name}
                              </p>
                            )}
                          </div>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/contacts/${att.contact_id}`}>
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </Button>
                        </div>
                      )
                  )}
                </div>
              </div>
            ) : null}

            {/* Meeting Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{meeting.duration_minutes} minutes</span>
              </div>

              {meeting.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{meeting.location}</span>
                </div>
              )}

              {meeting.meeting_link && (
                <div className="flex items-center gap-2 text-sm col-span-2">
                  <LinkIcon className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={meeting.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline truncate"
                  >
                    {meeting.meeting_link}
                  </a>
                </div>
              )}
            </div>

            {meeting.description && (
              <div>
                <Label className="text-xs text-muted-foreground">Description</Label>
                <p className="text-sm mt-1">{meeting.description}</p>
              </div>
            )}

            {/* Outcome (if completed) */}
            {meeting.status === "completed" && meeting.outcome && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <Label className="text-xs text-green-700 dark:text-green-400">Outcome</Label>
                <p className="text-sm font-medium text-green-800 dark:text-green-300 mt-1">
                  {meeting.outcome}
                </p>
                {meeting.outcome_notes && (
                  <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                    {meeting.outcome_notes}
                  </p>
                )}
              </div>
            )}

            <Separator />

            {/* Meeting Notes */}
            <MeetingNotes meeting={meeting} userId={userId} />
          </div>

          <DialogFooter className="gap-2">
            {meeting.status === "scheduled" && (
              <>
                <Button
                  variant="destructive"
                  onClick={handleCancel}
                  disabled={cancelMeeting.isPending}
                >
                  {cancelMeeting.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <X className="h-4 w-4 mr-2" />
                  )}
                  Cancel Meeting
                </Button>
                <Button onClick={() => setShowCompleteDialog(true)}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Complete
                </Button>
              </>
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
            <DialogDescription>How did the meeting go?</DialogDescription>
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
            <Button onClick={handleComplete} disabled={completeMeeting.isPending}>
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
    </>
  );
}
