"use client";

import { useState } from "react";
import {
  useMeetingNotes,
  useCreateMeetingNote,
  useUpdateMeetingNote,
  useDeleteMeetingNote,
  useToggleActionItem,
} from "@/hooks/use-meeting-notes";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  CheckSquare,
  Square,
  Loader2,
  ListTodo,
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Meeting, MeetingNote } from "@/types/database";

interface MeetingNotesProps {
  meeting: Meeting;
  userId: string;
}

export function MeetingNotes({ meeting, userId }: MeetingNotesProps) {
  const [newNote, setNewNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

  const { data: notes, isLoading } = useMeetingNotes(meeting.id);
  const createNote = useCreateMeetingNote();
  const updateNote = useUpdateMeetingNote();
  const deleteNote = useDeleteMeetingNote();
  const toggleActionItem = useToggleActionItem();

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      await createNote.mutateAsync({
        meeting_id: meeting.id,
        user_id: userId,
        content: newNote.trim(),
      });
      setNewNote("");
      toast.success("Note added");
    } catch (error: any) {
      toast.error(error.message || "Failed to add note");
    }
  };

  const handleUpdateNote = async (noteId: string) => {
    if (!editingContent.trim()) return;

    try {
      await updateNote.mutateAsync({
        id: noteId,
        meetingId: meeting.id,
        updates: { content: editingContent.trim() },
      });
      setEditingId(null);
      setEditingContent("");
      toast.success("Note updated");
    } catch (error: any) {
      toast.error(error.message || "Failed to update note");
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNote.mutateAsync({ id: noteId, meetingId: meeting.id });
      toast.success("Note deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete note");
    }
  };

  const handleToggleActionItem = async (note: MeetingNote) => {
    try {
      await toggleActionItem.mutateAsync({
        noteId: note.id,
        meetingId: meeting.id,
        isActionItem: !note.is_action_item,
        noteContent: note.content,
        contactId: meeting.contact_id,
        userId: userId,
        meetingDate: meeting.scheduled_at,
      });
      
      if (!note.is_action_item) {
        toast.success("Action item created - task added!");
      } else {
        toast.info("Action item removed");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to toggle action item");
    }
  };

  const actionItemCount = notes?.filter((n) => n.is_action_item).length || 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Meeting Notes</h3>
        {actionItemCount > 0 && (
          <Badge variant="secondary" className="gap-1">
            <ListTodo className="h-3 w-3" />
            {actionItemCount} action item{actionItemCount > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {/* Add Note */}
      <div className="flex gap-2">
        <Textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a note..."
          className="min-h-[60px] resize-none text-sm"
          rows={2}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              onClick={handleAddNote}
              disabled={!newNote.trim() || createNote.isPending}
              className="shrink-0 self-end h-9 w-9"
              aria-label="Add note"
            >
              {createNote.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add note</TooltipContent>
        </Tooltip>
      </div>

      {/* Notes List */}
      <ScrollArea className="max-h-[300px]">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : notes && notes.length > 0 ? (
          <div className="space-y-2 pr-2">
            {notes.map((note) => (
              <NoteItem
                key={note.id}
                note={note}
                isEditing={editingId === note.id}
                editingContent={editingContent}
                onEditContentChange={setEditingContent}
                onStartEdit={() => {
                  setEditingId(note.id);
                  setEditingContent(note.content);
                }}
                onSaveEdit={() => handleUpdateNote(note.id)}
                onCancelEdit={() => {
                  setEditingId(null);
                  setEditingContent("");
                }}
                onDelete={() => handleDeleteNote(note.id)}
                onToggleActionItem={() => handleToggleActionItem(note)}
                isToggling={toggleActionItem.isPending}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No notes yet. Add notes above.
          </p>
        )}
      </ScrollArea>
    </div>
  );
}

interface NoteItemProps {
  note: MeetingNote & { tasks?: { id: string; title: string; status: string } | null };
  isEditing: boolean;
  editingContent: string;
  onEditContentChange: (content: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onToggleActionItem: () => void;
  isToggling: boolean;
}

function NoteItem({
  note,
  isEditing,
  editingContent,
  onEditContentChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onToggleActionItem,
  isToggling,
}: NoteItemProps) {
  if (isEditing) {
    return (
      <div className="p-3 rounded-lg border bg-muted space-y-2">
        <Textarea
          value={editingContent}
          onChange={(e) => onEditContentChange(e.target.value)}
          className="min-h-[60px] text-sm"
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={onCancelEdit}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button size="sm" onClick={onSaveEdit}>
            <Check className="h-4 w-4 mr-1" />
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group p-3 rounded-lg border transition-colors ${
        note.is_action_item
          ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
          : "bg-card hover:bg-muted/50"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Action Item Checkbox */}
        <button
          onClick={onToggleActionItem}
          disabled={isToggling}
          className="mt-0.5 shrink-0"
          title={note.is_action_item ? "Remove action item" : "Mark as action item"}
        >
          {isToggling ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : note.is_action_item ? (
            <CheckSquare className="h-4 w-4 text-amber-600" />
          ) : (
            <Square className="h-4 w-4 text-muted-foreground hover:text-amber-600 transition-colors" />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm">{note.content}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
            </span>
            {note.is_action_item && note.tasks && (
              <Badge
                variant={note.tasks.status === "completed" ? "default" : "outline"}
                className="text-[10px]"
              >
                Task: {note.tasks.status}
              </Badge>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onStartEdit} aria-label="Edit note">
                <Edit2 className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={onDelete}
                aria-label="Delete note"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
