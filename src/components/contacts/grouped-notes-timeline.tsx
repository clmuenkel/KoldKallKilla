"use client";

import { useState } from "react";
import { useContactNotesGrouped, useDeleteNote, useToggleNotePin, CallWithNotes } from "@/hooks/use-notes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pin,
  PinOff,
  Trash2,
  ChevronDown,
  ChevronRight,
  Phone,
  PhoneOff,
  PhoneMissed,
  MessageSquare,
  Building2,
  Calendar,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Note, Call } from "@/types/database";

interface GroupedNotesTimelineProps {
  contactId: string;
  companyId?: string | null;
}

export function GroupedNotesTimeline({ contactId, companyId }: GroupedNotesTimelineProps) {
  const { pinnedNotes, callGroups, manualNotes, companyNotes, isLoading } = useContactNotesGrouped(contactId, companyId);
  const deleteNote = useDeleteNote();
  const togglePin = useToggleNotePin();

  const [expandedCalls, setExpandedCalls] = useState<Set<string>>(new Set());

  const toggleCallExpanded = (callId: string) => {
    setExpandedCalls((prev) => {
      const next = new Set(prev);
      if (next.has(callId)) {
        next.delete(callId);
      } else {
        next.add(callId);
      }
      return next;
    });
  };

  const handleTogglePin = async (noteId: string, currentlyPinned: boolean) => {
    try {
      await togglePin.mutateAsync({ id: noteId, isPinned: !currentlyPinned });
      toast.success(currentlyPinned ? "Note unpinned" : "Note pinned");
    } catch (error: any) {
      toast.error(error.message || "Failed to update note");
    }
  };

  const handleDelete = async (noteId: string) => {
    try {
      await deleteNote.mutateAsync(noteId);
      toast.success("Note deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete note");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const hasNotes = pinnedNotes.length > 0 || callGroups.length > 0 || manualNotes.length > 0 || companyNotes.length > 0;

  if (!hasNotes) {
    return (
      <div className="text-center py-8">
        <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No notes yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Add notes manually or they&apos;ll be created automatically during calls
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pinned Notes */}
      {pinnedNotes.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Pin className="h-4 w-4" />
            Pinned Notes
          </h3>
          <div className="space-y-2">
            {pinnedNotes.map((note) => (
              <NoteItem
                key={note.id}
                note={note}
                onTogglePin={handleTogglePin}
                onDelete={handleDelete}
                showCallBadge={note.source === "call"}
              />
            ))}
          </div>
        </section>
      )}

      {/* Call Groups */}
      {callGroups.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Call Notes
          </h3>
          <div className="space-y-3">
            {callGroups.map((group) => (
              <CallGroup
                key={group.call.id}
                group={group}
                isExpanded={expandedCalls.has(group.call.id)}
                onToggleExpand={() => toggleCallExpanded(group.call.id)}
                onTogglePin={handleTogglePin}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </section>
      )}

      {/* Manual Notes */}
      {manualNotes.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Notes
          </h3>
          <div className="space-y-2">
            {manualNotes.map((note) => (
              <NoteItem
                key={note.id}
                note={note}
                onTogglePin={handleTogglePin}
                onDelete={handleDelete}
                showDate
              />
            ))}
          </div>
        </section>
      )}

      {/* Company Notes */}
      {companyNotes.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Company Notes
          </h3>
          <div className="space-y-2">
            {companyNotes.map((note) => (
              <NoteItem
                key={note.id}
                note={note}
                onTogglePin={handleTogglePin}
                onDelete={handleDelete}
                showDate
                isCompanyNote
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

interface NoteItemProps {
  note: Note;
  onTogglePin: (id: string, isPinned: boolean) => void;
  onDelete: (id: string) => void;
  showCallBadge?: boolean;
  showDate?: boolean;
  isCompanyNote?: boolean;
}

function NoteItem({ note, onTogglePin, onDelete, showCallBadge, showDate, isCompanyNote }: NoteItemProps) {
  return (
    <div
      className={cn(
        "group p-3 rounded-lg border bg-card transition-colors hover:bg-muted/50",
        note.is_pinned && "border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20",
        isCompanyNote && "border-blue-500/30 bg-blue-50/30 dark:bg-blue-950/20"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Timestamp badge for call notes */}
          {note.call_timestamp && (
            <Badge variant="secondary" className="font-mono text-xs mb-1.5">
              {note.call_timestamp}
            </Badge>
          )}
          
          {/* Note content */}
          <p className="text-sm whitespace-pre-wrap">{note.content}</p>
          
          {/* Metadata */}
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            {showDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(note.created_at), "MMM d, yyyy")}
              </span>
            )}
            {showCallBadge && (
              <Badge variant="outline" className="text-xs">
                <Phone className="h-3 w-3 mr-1" />
                Call note
              </Badge>
            )}
            {isCompanyNote && (
              <Badge variant="outline" className="text-xs text-blue-600">
                <Building2 className="h-3 w-3 mr-1" />
                Company-wide
              </Badge>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onTogglePin(note.id, note.is_pinned)}
              >
                {note.is_pinned ? (
                  <PinOff className="h-3.5 w-3.5 text-amber-600" />
                ) : (
                  <Pin className="h-3.5 w-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{note.is_pinned ? "Unpin" : "Pin"}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => onDelete(note.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

interface CallGroupProps {
  group: CallWithNotes;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onTogglePin: (id: string, isPinned: boolean) => void;
  onDelete: (id: string) => void;
}

function CallGroup({ group, isExpanded, onToggleExpand, onTogglePin, onDelete }: CallGroupProps) {
  const { call, notes } = group;

  const getOutcomeIcon = (outcome: string) => {
    switch (outcome) {
      case "connected":
        return <Phone className="h-4 w-4 text-green-600" />;
      case "voicemail":
        return <PhoneMissed className="h-4 w-4 text-amber-600" />;
      case "no_answer":
        return <PhoneOff className="h-4 w-4 text-slate-500" />;
      default:
        return <Phone className="h-4 w-4" />;
    }
  };

  const getOutcomeLabel = (outcome: string) => {
    switch (outcome) {
      case "connected":
        return "Connected";
      case "voicemail":
        return "Voicemail";
      case "no_answer":
        return "No Answer";
      case "ai_screener":
        return "AI Screener";
      case "wrong_number":
        return "Wrong Number";
      case "gatekeeper":
        return "Gatekeeper";
      default:
        return outcome;
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Call Header */}
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          {getOutcomeIcon(call.outcome)}
          <div className="text-left">
            <div className="text-sm font-medium">
              {format(new Date(call.started_at), "MMM d, yyyy")}
              {call.duration_seconds && (
                <span className="text-muted-foreground ml-2">
                  ({formatDuration(call.duration_seconds)})
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {getOutcomeLabel(call.outcome)}
              {call.disposition && ` • ${call.disposition.replace(/_/g, " ")}`}
            </div>
          </div>
        </div>
        <Badge variant="secondary" className="text-xs">
          {notes.length} note{notes.length !== 1 ? "s" : ""}
        </Badge>
      </button>

      {/* Notes */}
      {isExpanded && (
        <div className="p-3 space-y-2 border-t">
          {notes.map((note) => (
            <div
              key={note.id}
              className={cn(
                "group flex items-start gap-3 p-2 rounded hover:bg-muted/50 transition-colors",
                note.is_pinned && "bg-amber-50/50 dark:bg-amber-950/20"
              )}
            >
              {/* Timestamp */}
              <Badge variant="secondary" className="font-mono text-xs shrink-0">
                {note.call_timestamp || "--:--"}
              </Badge>

              {/* Content */}
              <p className="flex-1 text-sm whitespace-pre-wrap min-w-0">{note.content}</p>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePin(note.id, note.is_pinned);
                      }}
                    >
                      {note.is_pinned ? (
                        <PinOff className="h-3 w-3 text-amber-600" />
                      ) : (
                        <Pin className="h-3 w-3" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{note.is_pinned ? "Unpin" : "Pin"}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(note.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete</TooltipContent>
                </Tooltip>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
