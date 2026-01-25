"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Clock, Plus, Trash2, Edit2, Check, X, Building2, ListTodo } from "lucide-react";
import type { TimestampedNote } from "@/types/database";
import { parseNote, hasAtSyntax, type ParsedSection } from "@/lib/parse-note";
import { TaskPopup } from "./task-popup";

interface TimestampedNotesProps {
  notes: TimestampedNote[];
  elapsedSeconds: number;
  isCallActive: boolean;
  onAddNote: (note: TimestampedNote, parsed?: { companySections: ParsedSection[]; personalSections: ParsedSection[] }) => void;
  onUpdateNote: (index: number, note: TimestampedNote) => void;
  onDeleteNote: (index: number) => void;
  // For @ syntax
  contactId?: string;
  contactName?: string;
  userId?: string;
  companyId?: string;
}

export function TimestampedNotesCompact({
  notes,
  elapsedSeconds,
  isCallActive,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  contactId,
  contactName,
  userId,
  companyId,
}: TimestampedNotesProps) {
  const [newNote, setNewNote] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Task popup state
  const [taskPopupOpen, setTaskPopupOpen] = useState(false);
  const [pendingTaskContent, setPendingTaskContent] = useState("");
  const [pendingTaskQueue, setPendingTaskQueue] = useState<string[]>([]);
  const [pendingNoteToAdd, setPendingNoteToAdd] = useState<TimestampedNote | null>(null);
  const [pendingParsedData, setPendingParsedData] = useState<{ companySections: ParsedSection[]; personalSections: ParsedSection[] } | null>(null);

  const formatTime = useCallback((seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  // Newest notes show at top, no auto-scroll needed

  const processNextTask = useCallback(() => {
    if (pendingTaskQueue.length > 0) {
      const [nextTask, ...remaining] = pendingTaskQueue;
      setPendingTaskContent(nextTask);
      setPendingTaskQueue(remaining);
      setTaskPopupOpen(true);
    } else {
      // All tasks processed, now add the note
      if (pendingNoteToAdd) {
        onAddNote(pendingNoteToAdd, pendingParsedData || undefined);
        setPendingNoteToAdd(null);
        setPendingParsedData(null);
      }
    }
  }, [pendingTaskQueue, pendingNoteToAdd, pendingParsedData, onAddNote]);

  const handleTaskCreated = useCallback(() => {
    setTaskPopupOpen(false);
    // Process next task in queue or finalize note
    setTimeout(() => processNextTask(), 100);
  }, [processNextTask]);

  const handleTaskPopupClose = useCallback((open: boolean) => {
    if (!open) {
      setTaskPopupOpen(false);
      // Even if cancelled, process next task or finalize
      setTimeout(() => processNextTask(), 100);
    }
  }, [processNextTask]);

  const handleAddNote = () => {
    if (!newNote.trim()) return;

    const noteText = newNote.trim();
    const parsed = parseNote(noteText);
    
    const note: TimestampedNote = {
      time: formatTime(elapsedSeconds),
      note: noteText,
    };

    // If there are @task sections, show popup for each
    if (parsed.hasTasks && contactId && userId) {
      const taskContents = parsed.taskSections.map(s => s.content);
      setPendingNoteToAdd(note);
      setPendingParsedData({
        companySections: parsed.companySections,
        personalSections: parsed.personalSections,
      });
      
      if (taskContents.length > 0) {
        const [firstTask, ...remainingTasks] = taskContents;
        setPendingTaskContent(firstTask);
        setPendingTaskQueue(remainingTasks);
        setTaskPopupOpen(true);
      }
    } else {
      // No tasks, add note directly with parsed data
      onAddNote(note, parsed.hasCompanyNote ? {
        companySections: parsed.companySections,
        personalSections: parsed.personalSections,
      } : undefined);
    }

    setNewNote("");
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddNote();
    }
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditingText(notes[index].note);
  };

  const handleSaveEdit = () => {
    if (editingIndex === null) return;

    onUpdateNote(editingIndex, {
      ...notes[editingIndex],
      note: editingText.trim(),
    });
    setEditingIndex(null);
    setEditingText("");
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingText("");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b mb-2">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Notes</h3>
        </div>
        {isCallActive && (
          <Badge variant="outline" className="font-mono text-xs">
            {formatTime(elapsedSeconds)}
          </Badge>
        )}
      </div>

      {/* Notes list */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="space-y-1.5 pr-2">
            {notes.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                {isCallActive 
                  ? "Type notes below - auto-timestamped"
                  : "No notes yet"}
              </p>
            ) : (
              // Show newest notes first (reverse order)
              [...notes].reverse().map((note, reverseIndex) => {
                const originalIndex = notes.length - 1 - reverseIndex;
                return (
                  <NoteItem
                    key={originalIndex}
                    note={note}
                    isEditing={editingIndex === originalIndex}
                    editingText={editingText}
                    onEditTextChange={setEditingText}
                    onStartEdit={() => handleStartEdit(originalIndex)}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={handleCancelEdit}
                    onDelete={() => onDeleteNote(originalIndex)}
                  />
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Input area */}
      {isCallActive && (
        <div className="shrink-0 mt-2 pt-2 border-t space-y-1.5">
          {/* @ syntax hint */}
          {hasAtSyntax(newNote) && (
            <div className="flex gap-2 text-[10px] text-muted-foreground">
              {newNote.toLowerCase().includes("@company") && (
                <span className="flex items-center gap-1 text-blue-500">
                  <Building2 className="h-3 w-3" /> Company note
                </span>
              )}
              {newNote.toLowerCase().includes("@task") && (
                <span className="flex items-center gap-1 text-amber-500">
                  <ListTodo className="h-3 w-3" /> Task will be created
                </span>
              )}
            </div>
          )}
          <div className="flex gap-1.5">
            <Textarea
              ref={textareaRef}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type note + Enter... (@company; @task;)"
              className="min-h-[50px] resize-none text-sm"
              rows={2}
            />
            <Button
              size="icon"
              onClick={handleAddNote}
              disabled={!newNote.trim()}
              className="shrink-0 self-end h-8 w-8"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Task creation popup */}
      {contactId && userId && (
        <TaskPopup
          open={taskPopupOpen}
          onOpenChange={handleTaskPopupClose}
          taskContent={pendingTaskContent}
          contactId={contactId}
          contactName={contactName || "Contact"}
          userId={userId}
          onTaskCreated={handleTaskCreated}
        />
      )}
    </div>
  );
}

function NoteItem({
  note,
  isEditing,
  editingText,
  onEditTextChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: {
  note: TimestampedNote;
  isEditing: boolean;
  editingText: string;
  onEditTextChange: (text: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
}) {
  if (isEditing) {
    return (
      <div className="flex gap-1.5 items-start p-1.5 rounded bg-muted">
        <Badge variant="secondary" className="font-mono text-[10px] shrink-0">
          {note.time}
        </Badge>
        <div className="flex-1 space-y-1.5">
          <Textarea
            value={editingText}
            onChange={(e) => onEditTextChange(e.target.value)}
            className="min-h-[36px] text-xs"
            rows={2}
            autoFocus
          />
          <div className="flex gap-1 justify-end">
            <Button size="icon" variant="ghost" className="h-5 w-5" onClick={onCancelEdit}>
              <X className="h-3 w-3" />
            </Button>
            <Button size="icon" className="h-5 w-5" onClick={onSaveEdit}>
              <Check className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Parse note for visual indicators
  const parsed = parseNote(note.note);
  const hasCompany = parsed.hasCompanyNote;
  const hasTask = parsed.hasTasks;

  return (
    <div className={`group flex gap-1.5 items-start p-1.5 rounded hover:bg-muted/50 transition-colors ${
      hasCompany ? "border-l-2 border-l-blue-500" : hasTask ? "border-l-2 border-l-amber-500" : ""
    }`}>
      <Badge variant="secondary" className="font-mono text-[10px] shrink-0">
        {note.time}
      </Badge>
      <div className="flex-1 min-w-0">
        <p className="text-xs whitespace-pre-wrap leading-relaxed">{note.note}</p>
        {/* Show parsed section indicators */}
        {(hasCompany || hasTask) && (
          <div className="flex gap-2 mt-1">
            {hasCompany && (
              <span className="text-[9px] text-blue-500 flex items-center gap-0.5">
                <Building2 className="h-2.5 w-2.5" /> Company
              </span>
            )}
            {hasTask && (
              <span className="text-[9px] text-amber-500 flex items-center gap-0.5">
                <ListTodo className="h-2.5 w-2.5" /> Task
              </span>
            )}
          </div>
        )}
      </div>
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Button size="icon" variant="ghost" className="h-5 w-5" onClick={onStartEdit}>
          <Edit2 className="h-2.5 w-2.5" />
        </Button>
        <Button 
          size="icon" 
          variant="ghost" 
          className="h-5 w-5 text-destructive hover:text-destructive" 
          onClick={onDelete}
        >
          <Trash2 className="h-2.5 w-2.5" />
        </Button>
      </div>
    </div>
  );
}

// Keep old export name for backwards compatibility
export { TimestampedNotesCompact as TimestampedNotes };

// Compact version for showing in results/history - shows all notes, newest first
export function TimestampedNotesDisplay({ notes, maxHeight = "200px" }: { notes: TimestampedNote[]; maxHeight?: string }) {
  if (!notes || notes.length === 0) {
    return null;
  }

  // Show newest first
  const reversedNotes = [...notes].reverse();

  return (
    <ScrollArea className="pr-2" style={{ maxHeight }}>
      <div className="space-y-1">
        {reversedNotes.map((note, index) => (
          <div key={index} className="flex gap-2 text-sm">
            <span className="text-muted-foreground font-mono text-xs shrink-0">{note.time}</span>
            <span className="whitespace-pre-wrap">{note.note}</span>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
