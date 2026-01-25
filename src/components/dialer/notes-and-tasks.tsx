"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTasks, useCompleteTask, useCreateTask } from "@/hooks/use-tasks";
import { useCalls } from "@/hooks/use-calls";
import { useCreateCompanyNote } from "@/hooks/use-notes";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Phone,
  Mail,
  Circle,
  Loader2,
  CheckCircle2,
  Building2,
  History,
  PhoneIncoming,
  PhoneOff,
  PhoneMissed,
  CalendarClock,
  ListTodo,
} from "lucide-react";
import { toast } from "sonner";
import { format, addDays, isToday, isPast, formatDistanceToNow } from "date-fns";
import type { Contact, TimestampedNote, Call, Task } from "@/types/database";
import { parseNote, hasAtSyntax, type ParsedSection } from "@/lib/parse-note";
import { TaskPopup } from "./task-popup";
import { TaskDetailDialog } from "@/components/tasks/task-detail-dialog";

interface NotesAndTasksProps {
  contact: Contact;
  colleagues?: Contact[];
  userId: string;
  notes: TimestampedNote[];
  elapsedSeconds: number;
  isCallActive: boolean;
  onAddNote: (note: TimestampedNote) => void;
  onUpdateNote: (index: number, note: TimestampedNote) => void;
  onDeleteNote: (index: number) => void;
}

export function NotesAndTasks({
  contact,
  colleagues = [],
  userId,
  notes,
  elapsedSeconds,
  isCallActive,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
}: NotesAndTasksProps) {
  // Notes state
  const [newNote, setNewNote] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const notesScrollRef = useRef<HTMLDivElement>(null);
  
  // Task popup state for @ syntax
  const [taskPopupOpen, setTaskPopupOpen] = useState(false);
  const [pendingTaskContent, setPendingTaskContent] = useState("");
  const [pendingTaskQueue, setPendingTaskQueue] = useState<string[]>([]);
  const [pendingNoteToAdd, setPendingNoteToAdd] = useState<TimestampedNote | null>(null);
  
  // Task detail dialog state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);

  // Fetch call history for this contact
  const { data: callHistory, isLoading: loadingHistory } = useCalls({ 
    contactId: contact.id,
    limit: 10 
  });

  // Tasks state
  const { data: tasks, isLoading: tasksLoading } = useTasks({ contactId: contact.id });
  const completeTask = useCompleteTask();
  const createTask = useCreateTask();
  const createCompanyNote = useCreateCompanyNote();
  const [createdTasks, setCreatedTasks] = useState<Set<string>>(new Set());

  const pendingTasks = tasks?.filter(t => t.status === "todo" || t.status === "pending") || [];

  // Format time for notes
  const formatTime = useCallback((seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  // Auto-scroll notes when new note added
  useEffect(() => {
    if (notesScrollRef.current) {
      notesScrollRef.current.scrollTop = notesScrollRef.current.scrollHeight;
    }
  }, [notes.length]);

  // Reset created tasks when contact changes
  useEffect(() => {
    setCreatedTasks(new Set());
  }, [contact.id]);

  // Process task queue for @ syntax
  const processNextTask = useCallback(() => {
    if (pendingTaskQueue.length > 0) {
      const [nextTask, ...remaining] = pendingTaskQueue;
      setPendingTaskContent(nextTask);
      setPendingTaskQueue(remaining);
      setTaskPopupOpen(true);
    } else {
      // All tasks processed, now add the note
      if (pendingNoteToAdd) {
        onAddNote(pendingNoteToAdd);
        setPendingNoteToAdd(null);
      }
    }
  }, [pendingTaskQueue, pendingNoteToAdd, onAddNote]);

  const handleTaskCreated = useCallback(() => {
    setTaskPopupOpen(false);
    setTimeout(() => processNextTask(), 100);
  }, [processNextTask]);

  const handleTaskPopupClose = useCallback((open: boolean) => {
    if (!open) {
      setTaskPopupOpen(false);
      setTimeout(() => processNextTask(), 100);
    }
  }, [processNextTask]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    const noteText = newNote.trim();
    const parsed = parseNote(noteText);
    
    // SPLIT NOTES:
    // 1. Personal sections → go to timestamped_notes (shown in call history)
    // 2. @company sections → go to notes table with is_company_wide=true
    // 3. @task sections → trigger task popup
    
    // Build personal note text (only personal sections)
    const personalText = parsed.personalSections.map(s => s.content).join(" ").trim();
    
    // Create timestamped note with ONLY personal content
    const note: TimestampedNote = {
      time: formatTime(elapsedSeconds),
      note: personalText || noteText, // Fallback to full text if no personal sections
    };

    // Save company-wide notes to database
    if (parsed.hasCompanyNote && contact.company_id) {
      for (const section of parsed.companySections) {
        try {
          await createCompanyNote.mutateAsync({
            user_id: userId,
            contact_id: contact.id,
            company_id: contact.company_id,
            content: section.content,
          });
        } catch (error) {
          console.error("Failed to save company note:", error);
        }
      }
      toast.success("Company note saved!", {
        description: "Note will appear on all contacts at this company",
      });
    }

    // If there are @task sections, show popup for each
    if (parsed.hasTasks && userId) {
      const taskContents = parsed.taskSections.map(s => s.content);
      // Only add personal note to timestamped notes
      if (personalText) {
        setPendingNoteToAdd(note);
      }
      
      if (taskContents.length > 0) {
        const [firstTask, ...remainingTasks] = taskContents;
        setPendingTaskContent(firstTask);
        setPendingTaskQueue(remainingTasks);
        setTaskPopupOpen(true);
      }
    } else if (personalText) {
      // No tasks, add personal note directly
      onAddNote(note);
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

  // Task handlers
  const handleQuickTask = async (type: "call" | "email", daysFromNow: number, label?: string) => {
    const taskKey = `${type}-${daysFromNow}`;
    if (createdTasks.has(taskKey)) {
      toast.info("Task already created");
      return;
    }

    const dueDate = format(addDays(new Date(), daysFromNow), "yyyy-MM-dd");
    const taskTitles: Record<string, string> = {
      call: `Follow up call with ${contact.first_name}${label ? ` (${label})` : ""}`,
      email: `Send email to ${contact.first_name}`,
    };

    try {
      await createTask.mutateAsync({
        user_id: userId,
        contact_id: contact.id,
        title: taskTitles[type],
        type,
        priority: daysFromNow > 30 ? "low" : "medium",
        status: "todo",
        due_date: dueDate,
      });

      setCreatedTasks(prev => new Set(prev).add(taskKey));
      toast.success(`Task created for ${label || format(new Date(dueDate), "MMM d")}!`);
    } catch (error: any) {
      toast.error(error.message || "Failed to create task");
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await completeTask.mutateAsync(taskId);
      toast.success("Task completed!");
    } catch (error: any) {
      toast.error(error.message || "Failed to complete task");
    }
  };

  // Get outcome icon
  const getOutcomeIcon = (outcome: string) => {
    switch (outcome) {
      case "connected": return <PhoneIncoming className="h-3 w-3 text-green-500" />;
      case "voicemail": return <PhoneOff className="h-3 w-3 text-amber-500" />;
      case "no_answer": return <PhoneMissed className="h-3 w-3 text-red-500" />;
      default: return <Phone className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getOutcomeLabel = (outcome: string) => {
    switch (outcome) {
      case "connected": return "Connected";
      case "voicemail": return "Voicemail";
      case "no_answer": return "No Answer";
      default: return outcome;
    }
  };

  return (
    <div className="flex flex-col h-full p-3">
      {/* Notes Section */}
      <div className="flex-1 flex flex-col min-h-0 mb-2">
        {/* Notes Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Notes & History</h3>
          </div>
          {isCallActive && (
            <Badge variant="outline" className="font-mono text-xs bg-green-50 text-green-700 border-green-200">
              {formatTime(elapsedSeconds)}
            </Badge>
          )}
        </div>

        {/* Notes Input - ALWAYS VISIBLE */}
        <div className="space-y-1.5 mb-2">
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
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type note + Enter... (@company; @task;)"
              className="min-h-[60px] resize-none text-sm flex-1"
              rows={2}
            />
            <Button
              size="icon"
              onClick={handleAddNote}
              disabled={!newNote.trim()}
              className="shrink-0 self-end h-9 w-9"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {/* @ syntax help */}
          <p className="text-[10px] text-muted-foreground">
            Use <code className="bg-muted px-1 rounded">@company text;</code> for company-wide notes, <code className="bg-muted px-1 rounded">@task text;</code> to create tasks
          </p>
        </div>

        {/* Notes and Call History List */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full" ref={notesScrollRef}>
            <div className="space-y-3 pr-2">
              {/* Current Session Notes */}
              {notes.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Current Session</p>
                  <div className="space-y-1.5">
                    {notes.map((note, index) => (
                      <NoteItem
                        key={index}
                        note={note}
                        isEditing={editingIndex === index}
                        editingText={editingText}
                        onEditTextChange={setEditingText}
                        onStartEdit={() => handleStartEdit(index)}
                        onSaveEdit={handleSaveEdit}
                        onCancelEdit={handleCancelEdit}
                        onDelete={() => onDeleteNote(index)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {notes.length === 0 && !callHistory?.length && (
                <p className="text-xs text-muted-foreground text-center py-3">
                  No notes yet. Type above to add.
                </p>
              )}

              {/* Previous Call History - Show 3 visible with scroll */}
              {callHistory && callHistory.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <History className="h-3 w-3 text-muted-foreground" />
                      <p className="text-xs font-medium text-muted-foreground">Previous Calls</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {callHistory.length} calls
                    </Badge>
                  </div>
                  {/* Fixed height container showing ~3 calls, scroll for more */}
                  <div className="max-h-[180px] overflow-y-auto space-y-2 pr-1">
                    {callHistory.map((call) => (
                      <CallHistoryItem key={call.id} call={call} />
                    ))}
                  </div>
                  {callHistory.length > 3 && (
                    <p className="text-[10px] text-muted-foreground text-center mt-1">
                      Scroll for more calls
                    </p>
                  )}
                </div>
              )}

              {loadingHistory && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Tasks Section - More compact, no separator */}
      <div className="shrink-0 pt-2 border-t">
        <h3 className="font-semibold text-sm mb-2">Quick Tasks</h3>
        
        {/* Short-term follow-ups */}
        <div className="grid grid-cols-3 gap-1.5 mb-2">
          <QuickButton
            icon={Phone}
            label="1 day"
            onClick={() => handleQuickTask("call", 1, "1 day")}
            created={createdTasks.has("call-1")}
            isPending={createTask.isPending}
          />
          <QuickButton
            icon={Phone}
            label="3 days"
            onClick={() => handleQuickTask("call", 3, "3 days")}
            created={createdTasks.has("call-3")}
            isPending={createTask.isPending}
          />
          <QuickButton
            icon={Phone}
            label="1 week"
            onClick={() => handleQuickTask("call", 7, "1 week")}
            created={createdTasks.has("call-7")}
            isPending={createTask.isPending}
          />
        </div>

        {/* Long-term follow-ups (months) */}
        <div className="grid grid-cols-3 gap-1.5 mb-2">
          <QuickButton
            icon={CalendarClock}
            label="1 month"
            onClick={() => handleQuickTask("call", 30, "1 month")}
            created={createdTasks.has("call-30")}
            isPending={createTask.isPending}
            variant="secondary"
          />
          <QuickButton
            icon={CalendarClock}
            label="3 months"
            onClick={() => handleQuickTask("call", 90, "3 months")}
            created={createdTasks.has("call-90")}
            isPending={createTask.isPending}
            variant="secondary"
          />
          <QuickButton
            icon={CalendarClock}
            label="6 months"
            onClick={() => handleQuickTask("call", 180, "6 months")}
            created={createdTasks.has("call-180")}
            isPending={createTask.isPending}
            variant="secondary"
          />
        </div>

        {/* Email */}
        <div className="mb-2">
          <QuickButton
            icon={Mail}
            label="Send Email"
            onClick={() => handleQuickTask("email", 0, "today")}
            created={createdTasks.has("email-0")}
            isPending={createTask.isPending}
            fullWidth
          />
        </div>

        {/* Pending Tasks List - Clickable */}
        {pendingTasks.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-muted-foreground mb-2">Pending ({pendingTasks.length})</p>
            <div className="space-y-1.5 max-h-28 overflow-y-auto">
              {pendingTasks.slice(0, 4).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-2 p-2 rounded bg-muted/50 text-xs hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => {
                    setSelectedTask(task);
                    setTaskDetailOpen(true);
                  }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCompleteTask(task.id);
                    }}
                    className="text-muted-foreground hover:text-green-500 transition-colors"
                    disabled={completeTask.isPending}
                  >
                    <Circle className="h-3.5 w-3.5" />
                  </button>
                  <span className="flex-1 truncate">{task.title}</span>
                  {task.importance && task.importance >= 8 && (
                    <Badge variant="destructive" className="text-[10px] px-1">
                      !
                    </Badge>
                  )}
                  {task.due_date && (
                    <Badge 
                      variant={isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) ? "destructive" : "secondary"} 
                      className="text-[10px] px-1"
                    >
                      {isToday(new Date(task.due_date)) ? "Today" : format(new Date(task.due_date), "MMM d")}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Task creation popup for @ syntax */}
      <TaskPopup
        open={taskPopupOpen}
        onOpenChange={handleTaskPopupClose}
        taskContent={pendingTaskContent}
        contactId={contact.id}
        contactName={`${contact.first_name} ${contact.last_name || ""}`}
        contactTitle={contact.title || undefined}
        contactCompany={contact.company_name || undefined}
        userId={userId}
        onTaskCreated={handleTaskCreated}
      />

      {/* Task detail dialog - opens when clicking a task */}
      {selectedTask && (
        <TaskDetailDialog
          open={taskDetailOpen}
          onOpenChange={(open) => {
            setTaskDetailOpen(open);
            if (!open) setSelectedTask(null);
          }}
          task={{
            ...selectedTask,
            contacts: {
              id: contact.id,
              first_name: contact.first_name,
              last_name: contact.last_name || undefined,
              company_name: contact.company_name || undefined,
            },
          }}
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
  // Parse for @ syntax
  const parsed = parseNote(note.note);
  const hasCompany = parsed.hasCompanyNote;
  const hasTask = parsed.hasTasks;

  if (isEditing) {
    return (
      <div className="flex gap-2 items-start p-2 rounded bg-muted">
        <Badge variant="secondary" className="font-mono text-[10px] shrink-0">
          {note.time}
        </Badge>
        <div className="flex-1 space-y-2">
          <Textarea
            value={editingText}
            onChange={(e) => onEditTextChange(e.target.value)}
            className="min-h-[40px] text-xs"
            rows={2}
            autoFocus
          />
          <div className="flex gap-1 justify-end">
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onCancelEdit}>
              <X className="h-3 w-3" />
            </Button>
            <Button size="icon" className="h-6 w-6" onClick={onSaveEdit}>
              <Check className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`group flex gap-2 items-start p-2 rounded transition-colors ${
      hasCompany 
        ? "bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border-l-2 border-l-blue-500" 
        : hasTask
          ? "border-l-2 border-l-amber-500 hover:bg-muted/50"
          : "hover:bg-muted/50"
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

function CallHistoryItem({ call }: { call: Call }) {
  const [expanded, setExpanded] = useState(false);
  const hasNotes = call.timestamped_notes && call.timestamped_notes.length > 0;
  const noteCount = call.timestamped_notes?.length || 0;
  
  // Get first note preview (truncated)
  const firstNotePreview = hasNotes 
    ? call.timestamped_notes[0].note.length > 50 
      ? call.timestamped_notes[0].note.substring(0, 50) + "..." 
      : call.timestamped_notes[0].note
    : null;

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case "connected": return "text-green-600 bg-green-50 dark:bg-green-900/20";
      case "voicemail": return "text-amber-600 bg-amber-50 dark:bg-amber-900/20";
      case "no_answer": return "text-red-600 bg-red-50 dark:bg-red-900/20";
      default: return "text-muted-foreground bg-muted";
    }
  };

  return (
    <div 
      className={`p-2 rounded border bg-card text-xs transition-colors ${
        hasNotes ? "cursor-pointer hover:bg-muted/50" : ""
      } ${expanded ? "ring-1 ring-primary/20" : ""}`}
      onClick={() => hasNotes && setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`text-[10px] ${getOutcomeColor(call.outcome)}`}>
            {call.outcome === "connected" ? "Connected" : 
             call.outcome === "voicemail" ? "VM" : 
             call.outcome === "no_answer" ? "No Answer" : call.outcome}
          </Badge>
          {call.disposition && (
            <span className="text-muted-foreground">{call.disposition}</span>
          )}
        </div>
        <span className="text-muted-foreground">
          {call.duration_seconds ? `${Math.floor(call.duration_seconds / 60)}m ${call.duration_seconds % 60}s` : "0s"}
        </span>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground">
        <span>{format(new Date(call.started_at), "MMM d, h:mm a")}</span>
        <span>•</span>
        <span>{formatDistanceToNow(new Date(call.started_at), { addSuffix: true })}</span>
      </div>
      
      {/* Notes Preview (collapsed) */}
      {hasNotes && !expanded && (
        <div className="mt-2 pt-2 border-t">
          <div className="flex items-start gap-2">
            <span className="text-[10px] text-muted-foreground shrink-0">📝</span>
            <p className="text-xs text-muted-foreground italic line-clamp-1">
              "{firstNotePreview}"
            </p>
          </div>
          {noteCount > 1 && (
            <p className="text-[10px] text-primary mt-1 hover:underline">
              +{noteCount - 1} more note{noteCount > 2 ? "s" : ""} • Click to expand
            </p>
          )}
          {noteCount === 1 && (
            <p className="text-[10px] text-primary mt-1 hover:underline">
              Click to see full note
            </p>
          )}
        </div>
      )}
      
      {/* Full Notes (expanded) */}
      {expanded && hasNotes && (
        <div className="mt-2 pt-2 border-t space-y-1.5">
          {call.timestamped_notes.map((note, idx) => (
            <div key={idx} className="flex gap-2 items-start">
              <span className="font-mono text-muted-foreground text-[10px] shrink-0 bg-muted px-1 rounded">
                {note.time}
              </span>
              <span className="text-xs">{note.note}</span>
            </div>
          ))}
          <p className="text-[10px] text-primary mt-1 hover:underline">
            Click to collapse
          </p>
        </div>
      )}
    </div>
  );
}

function QuickButton({
  icon: Icon,
  label,
  onClick,
  created,
  isPending,
  variant = "outline",
  fullWidth = false,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  created: boolean;
  isPending: boolean;
  variant?: "outline" | "secondary";
  fullWidth?: boolean;
}) {
  if (created) {
    return (
      <Button 
        variant="ghost" 
        size="sm" 
        className={`h-8 text-xs gap-1 ${fullWidth ? "w-full" : ""}`} 
        disabled
      >
        <CheckCircle2 className="h-3 w-3 text-green-500" />
        <span>Done</span>
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size="sm"
      onClick={onClick}
      disabled={isPending}
      className={`h-8 text-xs gap-1 ${fullWidth ? "w-full" : ""}`}
    >
      {isPending ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Icon className="h-3 w-3" />
      )}
      <span>{label}</span>
    </Button>
  );
}
