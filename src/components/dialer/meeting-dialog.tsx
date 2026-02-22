"use client";

import { useState, useEffect } from "react";
import { useCreateMeeting } from "@/hooks/use-meetings";
import { useContacts } from "@/hooks/use-contacts";
import { useIncrementSessionMeetings } from "@/hooks/use-sessions";
import { useDialerStore } from "@/stores/dialer-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Calendar, Clock, MapPin, Link as LinkIcon, Bell, Loader2, Users } from "lucide-react";
import { ContactMultiSelect } from "@/components/ui/contact-multi-select";
import { toast } from "sonner";
import { format, addMinutes, setHours, setMinutes } from "date-fns";
import { addBusinessDays } from "@/lib/utils";
import type { Contact } from "@/types/database";

interface MeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact;
  userId: string;
}

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

// Generate time slots from 6 AM to 9 PM in 15 min increments
const generateTimeSlots = () => {
  const slots: { value: string; label: string }[] = [];
  for (let hour = 6; hour <= 21; hour++) {
    for (let min = 0; min < 60; min += 15) {
      const time = `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const ampm = hour >= 12 ? "PM" : "AM";
      const label = `${displayHour}:${min.toString().padStart(2, "0")} ${ampm}`;
      slots.push({ value: time, label });
    }
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

export function MeetingDialog({ open, onOpenChange, contact, userId }: MeetingDialogProps) {
  const createMeeting = useCreateMeeting();
  const incrementSessionMeetings = useIncrementSessionMeetings();
  const sessionStartTime = useDialerStore((s) => s.sessionStartTime);
  const { data: contacts } = useContacts();

  const tomorrow = addBusinessDays(new Date(), 1);
  const defaultDate = format(tomorrow, "yyyy-MM-dd");

  const [title, setTitle] = useState(`Meeting with ${contact.first_name} ${contact.last_name || ""}`);
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState("30");
  const [location, setLocation] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [reminder, setReminder] = useState("15");
  const [description, setDescription] = useState("");
  const [additionalAttendeeIds, setAdditionalAttendeeIds] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setTitle(`Meeting with ${contact.first_name} ${contact.last_name || ""}`);
      setAdditionalAttendeeIds([]);
    }
  }, [open, contact.first_name, contact.last_name]);

  const handleSubmit = async () => {
    if (!title.trim() || !date || !time) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Parse the date and time in local timezone so the stored UTC matches the intended calendar day
    const [hours, minutes] = time.split(":").map(Number);
    const [y, mo, d] = date.split("-").map(Number);
    const scheduledDate = new Date(y, mo - 1, d, hours, minutes, 0, 0);

    // Calculate reminder time
    const reminderMinutes = parseInt(reminder);
    const reminderAt = reminderMinutes > 0 
      ? addMinutes(scheduledDate, -reminderMinutes).toISOString()
      : null;

    try {
      await createMeeting.mutateAsync({
        user_id: userId,
        contact_id: contact.id,
        company_id: contact.company_id || undefined,
        title: title.trim(),
        description: description.trim() || undefined,
        scheduled_at: scheduledDate.toISOString(),
        duration_minutes: parseInt(duration),
        location: location.trim() || undefined,
        meeting_link: meetingLink.trim() || undefined,
        reminder_at: reminderAt,
        status: "scheduled",
        attendee_ids: additionalAttendeeIds.length > 0 ? additionalAttendeeIds : undefined,
      });

      if (sessionStartTime) {
        try {
          await incrementSessionMeetings.mutateAsync();
        } catch {
          // Non-blocking: session history may not update
        }
      }

      toast.success("Meeting scheduled!");
      onOpenChange(false);
      
      // Reset form
      setTitle(`Meeting with ${contact.first_name} ${contact.last_name || ""}`);
      setDate(defaultDate);
      setTime("10:00");
      setDuration("30");
      setLocation("");
      setMeetingLink("");
      setReminder("15");
      setDescription("");
      setAdditionalAttendeeIds([]);
    } catch (error: unknown) {
      toast.error(error.message || "Failed to schedule meeting");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule Meeting
          </DialogTitle>
          <DialogDescription>
            Schedule a meeting with {contact.first_name} {contact.last_name}
            {contact.company_name && ` from ${contact.company_name}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Meeting Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Demo call, Discovery meeting, etc."
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={format(new Date(), "yyyy-MM-dd")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time *</Label>
              <Select value={time} onValueChange={setTime}>
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

          {/* Duration and Reminder */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Duration
              </Label>
              <Select value={duration} onValueChange={setDuration}>
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
              <Label htmlFor="reminder" className="flex items-center gap-1">
                <Bell className="h-3 w-3" />
                Reminder
              </Label>
              <Select value={reminder} onValueChange={setReminder}>
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

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Location (optional)
            </Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Office, Zoom, Phone call, etc."
            />
          </div>

          {/* Meeting Link */}
          <div className="space-y-2">
            <Label htmlFor="meeting-link" className="flex items-center gap-1">
              <LinkIcon className="h-3 w-3" />
              Meeting Link (optional)
            </Label>
            <Input
              id="meeting-link"
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              placeholder="https://zoom.us/j/..."
            />
          </div>

          {/* Add attendees */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              Add attendees (optional)
            </Label>
            <ContactMultiSelect
              contacts={contacts}
              value={additionalAttendeeIds}
              onValueChange={setAdditionalAttendeeIds}
              placeholder="Add other people to this meeting..."
              excludeIds={[contact.id]}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Notes (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Agenda, topics to discuss..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createMeeting.isPending}>
            {createMeeting.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Scheduling...
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Meeting
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
