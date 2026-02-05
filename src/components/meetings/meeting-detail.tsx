"use client";

import { useState } from "react";
import { useMeeting, useUpdateMeeting, useCancelMeeting, useCompleteMeeting } from "@/hooks/use-meetings";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, isPast } from "date-fns";
import Link from "next/link";
import type { MeetingWithContact } from "@/types/database";

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
  const { data: meeting, isLoading } = useMeeting(meetingId);
  const updateMeeting = useUpdateMeeting();
  const cancelMeeting = useCancelMeeting();
  const completeMeeting = useCompleteMeeting();
  
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [completionOutcome, setCompletionOutcome] = useState("successful");
  const [completionNotes, setCompletionNotes] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

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
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
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

          <div className="space-y-6 py-4">
            {/* Contact Info */}
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
