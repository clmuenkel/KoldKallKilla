"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTasks, useCompleteTask, useCreateTask } from "@/hooks/use-tasks";
import { useCalls } from "@/hooks/use-calls";
import { useCreateCompanyNote, useNotes, useDeleteNote } from "@/hooks/use-notes";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
  MessageSquare,
  StickyNote,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { format, isToday, isPast, formatDistanceToNow } from "date-fns";
import { addBusinessDays } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Contact, TimestampedNote, Call, Task } from "@/types/database";
import { parseNote, hasAtSyntax } from "@/lib/parse-note";
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

  // Accordion state
  const [historyExpanded, setHistoryExpanded] = useState(true);
  const [savedNotesExpanded, setSavedNotesExpanded] = useState(true);

  // Fetch call history for this contact
  const { data: callHistory, isLoading: loadingHistory } = useCalls({ 
    contactId: contact.id,
    limit: 10 
  });

  // Fetch saved notes for this contact
  const { data: savedNotes, isLoading: loadingNotes } = useNotes({ 
    contactId: contact.id 
  });

  // Tasks state
  const { data: tasks, isLoading: tasksLoading } = useTasks({ contactId: contact.id });
  const completeTask = useCompleteTask();
  const createTask = useCreateTask();
  const createCompanyNote = useCreateCompanyNote();
  const deleteNote = useDeleteNote();
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
    
    // Build personal note text (only personal sections)
    const personalText = parsed.personalSections.map(s => s.content).join(" ").trim();
    
    // Create timestamped note with ONLY personal content
    const note: TimestampedNote = {
      time: formatTime(elapsedSeconds),
      note: personalText || noteText,
    };

    // Save company-wide notes to database
    if (parsed.hasCompanyNote) {
      if (!contact.company_id) {
        toast.warning("Contact has no company; company note not saved.", {
          description: "Personal note will still be saved.",
        });
      } else {
        let companySaveFailed = false;
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
            companySaveFailed = true;
          }
        }
        if (companySaveFailed) {
          toast.error("Failed to save company note. Check console or try again.");
        } else {
          toast.success("Company note saved!", {
            description: "Note will appear on all contacts at this company",
          });
        }
      }
    }

    // If there are @task sections, show popup for each
    if (parsed.hasTasks && userId) {
      const taskContents = parsed.taskSections.map(s => s.content);
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

    const dueDate = format(addBusinessDays(new Date(), daysFromNow), "yyyy-MM-dd");
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

  return (
    <div className="flex flex-col h-full">
      {/* Live Timer Badge - always at top when call active */}
      {isCallActive && (
        <div className="flex justify-center py-2 border-b bg-card/50 shrink-0">
          <Badge 
            className={cn(
              "font-mono text-sm px-3 py-1 gap-2",
              "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
            )}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            {formatTime(elapsedSeconds)}
          </Badge>
        </div>
      )}

      {/* Three stacked sections: History, Notes, Tasks */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        
        {/* === HISTORY SECTION (top, ~30%) === */}
        <div className="flex flex-col min-h-0 border-b" style={{ flex: "0 1 30%" }}>
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 shrink-0">
            <History className="h-3.5 w-3.5 text-primary" />
            <p className="text-xs font-semibold">History</p>
            {callHistory && callHistory.length > 0 && (
              <Badge variant="outline" className="text-[10px] h-4">{callHistory.length}</Badge>
            )}
          </div>
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-2 space-y-2">
              {callHistory && callHistory.length > 0 ? (
                callHistory.map((call) => (
                  <CallHistoryItem key={call.id} call={call} />
                ))
              ) : loadingHistory ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-[10px] text-muted-foreground">No call history yet</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* === NOTES SECTION (middle, ~40%) === */}
        <div className="flex flex-col min-h-0 border-b" style={{ flex: "1 1 40%" }}>
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 shrink-0">
            <StickyNote className="h-3.5 w-3.5 text-primary" />
            <p className="text-xs font-semibold">Notes</p>
            {notes.length > 0 && (
              <Badge variant="outline" className="text-[10px] h-4">{notes.length}</Badge>
            )}
          </div>
          <div className="flex flex-col flex-1 min-h-0 p-2">
            {/* Notes Input */}
            <div className="space-y-1.5 shrink-0 mb-2">
              {hasAtSyntax(newNote) && (
                <div className="flex gap-2 text-[10px]">
                  {newNote.toLowerCase().includes("@company") && (
                    <span className="flex items-center gap-1 text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded-full">
                      <Building2 className="h-2.5 w-2.5" /> Company
                    </span>
                  )}
                  {newNote.toLowerCase().includes("@task") && (
                    <span className="flex items-center gap-1 text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                      <ListTodo className="h-2.5 w-2.5" /> Task
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
                  placeholder="Type note + Enter..."
                  className="min-h-[50px] resize-none text-xs flex-1 bg-background"
                  rows={2}
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      onClick={handleAddNote}
                      disabled={!newNote.trim()}
                      className="shrink-0 self-end h-8 w-8"
                      aria-label="Add note"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Add note (Enter)</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Notes List - fixed max height so long notes scroll inside the box */}
            <ScrollArea className="flex-1 min-h-0 max-h-[280px]" ref={notesScrollRef}>
              <div className="space-y-1.5 pr-1">
                {notes.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Sparkles className="h-2.5 w-2.5 text-primary" />
                      <p className="text-[10px] font-semibold text-primary">Session</p>
                    </div>
                    <div className="space-y-1">
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

                {notes.length === 0 && !savedNotes?.length && (
                  <div className="text-center py-3">
                    <p className="text-[10px] text-muted-foreground">No notes yet</p>
                  </div>
                )}

                {savedNotes && savedNotes.length > 0 && (
                  <div className={cn(notes.length > 0 && "pt-2 border-t")}>
                    <button
                      onClick={() => setSavedNotesExpanded(!savedNotesExpanded)}
                      className="flex items-center justify-between w-full mb-1.5 hover:bg-muted/50 px-1 py-0.5 rounded transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="h-2.5 w-2.5 text-muted-foreground" />
                        <p className="text-[10px] font-medium text-muted-foreground">Previous</p>
                        <Badge variant="outline" className="text-[9px] h-3.5 px-1">{savedNotes.length}</Badge>
                      </div>
                      {savedNotesExpanded ? (
                        <ChevronUp className="h-2.5 w-2.5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
                      )}
                    </button>
                    
                    {savedNotesExpanded && (
                      <div className="space-y-1">
                        {savedNotes.map((note) => (
                          <div key={note.id} className="text-[10px] p-2 bg-muted/30 rounded group border border-transparent hover:border-border/50">
                            <div className="flex justify-between items-start gap-1">
                              <p className="whitespace-pre-wrap flex-1 text-foreground/90 line-clamp-2">{note.content}</p>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 opacity-0 group-hover:opacity-100 shrink-0"
                                onClick={() => {
                                  deleteNote.mutate(note.id, {
                                    onSuccess: () => toast.success("Note deleted"),
                                    onError: () => toast.error("Failed to delete"),
                                  });
                                }}
                              >
                                <Trash2 className="h-2.5 w-2.5 text-muted-foreground hover:text-destructive" />
                              </Button>
                            </div>
                            <span className="text-[9px] text-muted-foreground">{formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {loadingNotes && (
                  <div className="flex items-center justify-center py-2">
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* === TASKS SECTION (bottom, ~30%) === */}
        <div className="flex flex-col min-h-0" style={{ flex: "0 1 30%" }}>
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 shrink-0">
            <ListTodo className="h-3.5 w-3.5 text-primary" />
            <p className="text-xs font-semibold">Tasks</p>
            {pendingTasks.length > 0 && (
              <Badge variant="outline" className="text-[10px] h-4">{pendingTasks.length}</Badge>
            )}
          </div>
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-2 space-y-2">
              {/* Compact Quick Actions - single row */}
              <div className="flex gap-1 flex-wrap">
                <QuickButtonCompact label="1d" onClick={() => handleQuickTask("call", 1, "1 day")} created={createdTasks.has("call-1")} isPending={createTask.isPending} />
                <QuickButtonCompact label="3d" onClick={() => handleQuickTask("call", 3, "3 days")} created={createdTasks.has("call-3")} isPending={createTask.isPending} />
                <QuickButtonCompact label="1w" onClick={() => handleQuickTask("call", 7, "1 week")} created={createdTasks.has("call-7")} isPending={createTask.isPending} />
                <QuickButtonCompact label="1m" onClick={() => handleQuickTask("call", 30, "1 month")} created={createdTasks.has("call-30")} isPending={createTask.isPending} variant="secondary" />
                <QuickButtonCompact label="3m" onClick={() => handleQuickTask("call", 90, "3 months")} created={createdTasks.has("call-90")} isPending={createTask.isPending} variant="secondary" />
                <QuickButtonCompact label="6m" onClick={() => handleQuickTask("call", 180, "6 months")} created={createdTasks.has("call-180")} isPending={createTask.isPending} variant="secondary" />
                <QuickButtonCompact label="Email" onClick={() => handleQuickTask("email", 0, "today")} created={createdTasks.has("email-0")} isPending={createTask.isPending} icon={Mail} />
              </div>

              {/* Pending Tasks List */}
              {pendingTasks.length > 0 && (
                <div className="space-y-1">
                  {pendingTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-1.5 p-1.5 rounded text-[10px] bg-muted/30 hover:bg-muted/50 cursor-pointer"
                      onClick={() => { setSelectedTask(task); setTaskDetailOpen(true); }}
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCompleteTask(task.id); }}
                        className="text-muted-foreground hover:text-emerald-500"
                        disabled={completeTask.isPending}
                      >
                        <Circle className="h-3 w-3" />
                      </button>
                      <span className="flex-1 truncate font-medium">{task.title}</span>
                      {task.due_date && (
                        <Badge 
                          variant={isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) ? "destructive" : "secondary"} 
                          className="text-[9px] h-4 px-1"
                        >
                          {isToday(new Date(task.due_date)) ? "Today" : format(new Date(task.due_date), "M/d")}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {pendingTasks.length === 0 && (
                <div className="text-center py-2">
                  <p className="text-[10px] text-muted-foreground">No pending tasks</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
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

      {/* Task detail dialog */}
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

// Compact Quick Button for stacked layout
function QuickButtonCompact({
  label,
  onClick,
  created,
  isPending,
  variant = "outline",
  icon: Icon,
}: {
  label: string;
  onClick: () => void;
  created: boolean;
  isPending: boolean;
  variant?: "outline" | "secondary";
  icon?: React.ElementType;
}) {
  if (created) {
    return (
      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" disabled>
        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
      </Button>
    );
  }
  return (
    <Button
      variant={variant}
      size="sm"
      onClick={onClick}
      disabled={isPending}
      className="h-6 px-2 text-[10px] gap-1"
    >
      {isPending ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : Icon ? (
        <Icon className="h-3 w-3" />
      ) : null}
      {label}
    </Button>
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
  const parsed = parseNote(note.note);
  const hasCompany = parsed.hasCompanyNote;
  const hasTask = parsed.hasTasks;

  if (isEditing) {
    return (
      <div className="flex gap-2 items-start p-2.5 rounded-lg bg-muted border border-primary/30">
        <Badge variant="secondary" className="font-mono text-[10px] shrink-0 bg-primary/10">
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onCancelEdit} aria-label="Cancel">
                  <X className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Cancel</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" className="h-6 w-6" onClick={onSaveEdit} aria-label="Save">
                  <Check className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Save</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "group flex gap-2 items-start p-2.5 rounded-lg transition-all duration-200",
      hasCompany 
        ? "bg-blue-500/5 hover:bg-blue-500/10 border-l-2 border-blue-500" 
        : hasTask
          ? "bg-amber-500/5 hover:bg-amber-500/10 border-l-2 border-amber-500"
          : "bg-muted/30 hover:bg-muted/50 border border-transparent hover:border-border/50"
    )}>
      <Badge variant="secondary" className="font-mono text-[10px] shrink-0">
        {note.time}
      </Badge>
      <div className="flex-1 min-w-0">
        <p className="text-xs whitespace-pre-wrap leading-relaxed">{note.note}</p>
        {(hasCompany || hasTask) && (
          <div className="flex gap-2 mt-1.5">
            {hasCompany && (
              <span className="text-[9px] text-blue-500 flex items-center gap-0.5 bg-blue-500/10 px-1.5 py-0.5 rounded-full">
                <Building2 className="h-2.5 w-2.5" /> Company
              </span>
            )}
            {hasTask && (
              <span className="text-[9px] text-amber-500 flex items-center gap-0.5 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                <ListTodo className="h-2.5 w-2.5" /> Task
              </span>
            )}
          </div>
        )}
      </div>
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onStartEdit} aria-label="Edit note">
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
              className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10" 
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
  );
}

function CallHistoryItem({ call }: { call: Call }) {
  const [expanded, setExpanded] = useState(false);
  const hasNotes = call.timestamped_notes && call.timestamped_notes.length > 0;
  const noteCount = call.timestamped_notes?.length || 0;
  
  const firstNotePreview = hasNotes 
    ? call.timestamped_notes[0].note.length > 50 
      ? call.timestamped_notes[0].note.substring(0, 50) + "..." 
      : call.timestamped_notes[0].note
    : null;

  const getOutcomeConfig = (outcome: string) => {
    switch (outcome) {
      case "connected": return { 
        icon: PhoneIncoming, 
        label: "Connected", 
        color: "text-emerald-600 dark:text-emerald-400",
        bg: "bg-emerald-500/10"
      };
      case "voicemail": return { 
        icon: PhoneOff, 
        label: "Voicemail", 
        color: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-500/10"
      };
      case "no_answer": return { 
        icon: PhoneMissed, 
        label: "No Answer", 
        color: "text-red-600 dark:text-red-400",
        bg: "bg-red-500/10"
      };
      default: return { 
        icon: Phone, 
        label: outcome, 
        color: "text-muted-foreground",
        bg: "bg-muted"
      };
    }
  };

  const config = getOutcomeConfig(call.outcome);
  const OutcomeIcon = config.icon;

  return (
    <div 
      className={cn(
        "p-3 rounded-xl border bg-card text-xs transition-all",
        hasNotes && "cursor-pointer hover:shadow-sm hover:border-border",
        expanded && "ring-1 ring-primary/20"
      )}
      onClick={() => hasNotes && setExpanded(!expanded)}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("h-7 w-7 rounded-full flex items-center justify-center", config.bg)}>
            <OutcomeIcon className={cn("h-3.5 w-3.5", config.color)} />
          </div>
          <div>
            <p className={cn("font-semibold", config.color)}>{config.label}</p>
            <p className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(call.started_at), { addSuffix: true })}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono font-medium">
            {call.duration_seconds ? `${Math.floor(call.duration_seconds / 60)}:${(call.duration_seconds % 60).toString().padStart(2, '0')}` : "0:00"}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {format(new Date(call.started_at), "MMM d, h:mm a")}
          </p>
        </div>
      </div>
      
      {/* Disposition */}
      {call.disposition && (
        <div className="mt-2">
          <Badge variant="outline" className="text-[10px]">{call.disposition}</Badge>
        </div>
      )}
      
      {/* Notes Preview */}
      {hasNotes && !expanded && (
        <div className="mt-2 pt-2 border-t border-dashed">
          <p className="text-[10px] text-muted-foreground italic line-clamp-1">
            "{firstNotePreview}"
          </p>
          <p className="text-[10px] text-primary mt-1">
            {noteCount > 1 ? `+${noteCount - 1} more` : "View note"} →
          </p>
        </div>
      )}
      
      {/* Expanded Notes */}
      {expanded && hasNotes && (
        <div className="mt-2 pt-2 border-t space-y-2 animate-in slide-in-from-top-2 duration-200">
          {call.timestamped_notes.map((note, idx) => (
            <div key={idx} className="flex gap-2 items-start p-2 bg-muted/50 rounded">
              <span className="font-mono text-[10px] text-muted-foreground shrink-0 bg-muted px-1.5 py-0.5 rounded">
                {note.time}
              </span>
              <span className="text-xs">{note.note}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

