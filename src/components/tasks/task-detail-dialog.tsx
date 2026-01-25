"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  Clock,
  User,
  Building2,
  CheckCircle2,
  Circle,
  AlertCircle,
  Phone,
  Mail,
  CalendarCheck,
  ListTodo,
  Trash2,
  Loader2,
} from "lucide-react";
import { format, isPast, isToday, isTomorrow, parseISO } from "date-fns";
import { useCompleteTask, useDeleteTask } from "@/hooks/use-tasks";
import { toast } from "sonner";
import Link from "next/link";
import type { Task } from "@/types/database";

interface TaskDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task & {
    contacts?: {
      id: string;
      first_name: string;
      last_name?: string;
      company_name?: string;
    } | null;
  };
}

const TASK_TYPE_ICONS: Record<string, React.ReactNode> = {
  call: <Phone className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  follow_up: <CalendarCheck className="h-4 w-4" />,
  meeting: <Calendar className="h-4 w-4" />,
  other: <ListTodo className="h-4 w-4" />,
};

const TASK_TYPE_LABELS: Record<string, string> = {
  call: "Call",
  email: "Email",
  follow_up: "Follow-up",
  meeting: "Meeting",
  other: "Other",
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
};

export function TaskDetailDialog({
  open,
  onOpenChange,
  task,
}: TaskDetailDialogProps) {
  const completeTask = useCompleteTask();
  const deleteTask = useDeleteTask();

  const handleComplete = async () => {
    try {
      await completeTask.mutateAsync(task.id);
      toast.success("Task completed!");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to complete task");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    
    try {
      await deleteTask.mutateAsync(task.id);
      toast.success("Task deleted");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete task");
    }
  };

  const getDueDateStatus = () => {
    if (!task.due_date) return null;
    const dueDate = parseISO(task.due_date);
    
    if (task.status === "done") {
      return { label: "Completed", variant: "default" as const, color: "text-green-600" };
    }
    if (isPast(dueDate) && !isToday(dueDate)) {
      return { label: "Overdue", variant: "destructive" as const, color: "text-red-600" };
    }
    if (isToday(dueDate)) {
      return { label: "Due Today", variant: "secondary" as const, color: "text-amber-600" };
    }
    if (isTomorrow(dueDate)) {
      return { label: "Due Tomorrow", variant: "outline" as const, color: "text-blue-600" };
    }
    return { label: format(dueDate, "MMM d, yyyy"), variant: "outline" as const, color: "text-muted-foreground" };
  };

  const dueDateStatus = getDueDateStatus();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              {TASK_TYPE_ICONS[task.type || "other"] || <ListTodo className="h-5 w-5" />}
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg">{task.title}</DialogTitle>
              <DialogDescription className="mt-1">
                {TASK_TYPE_LABELS[task.type || "other"]} task
                {task.contacts && (
                  <> for {task.contacts.first_name} {task.contacts.last_name}</>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status and Priority */}
          <div className="flex items-center gap-2 flex-wrap">
            {task.status === "done" ? (
              <Badge variant="default" className="gap-1 bg-green-500">
                <CheckCircle2 className="h-3 w-3" />
                Completed
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1">
                <Circle className="h-3 w-3" />
                {task.status === "todo" ? "To Do" : task.status}
              </Badge>
            )}
            
            {task.priority && (
              <Badge variant="secondary" className="gap-1">
                <span className={`h-2 w-2 rounded-full ${PRIORITY_COLORS[task.priority]}`} />
                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
              </Badge>
            )}
            
            {task.importance && (
              <Badge variant="outline" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                Importance: {task.importance}/10
              </Badge>
            )}
          </div>

          {/* Due Date */}
          {task.due_date && dueDateStatus && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Due: </span>
              <Badge variant={dueDateStatus.variant} className={dueDateStatus.color}>
                {dueDateStatus.label}
              </Badge>
              {task.due_time && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {task.due_time}
                </span>
              )}
            </div>
          )}

          {/* Description */}
          {task.description && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-2">Description</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {task.description}
                </p>
              </div>
            </>
          )}

          {/* Contact Info */}
          {task.contacts && (
            <>
              <Separator />
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <User className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <Link 
                    href={`/contacts/${task.contacts.id}`}
                    className="font-medium hover:underline text-primary"
                  >
                    {task.contacts.first_name} {task.contacts.last_name}
                  </Link>
                  {task.contacts.company_name && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Building2 className="h-3 w-3" />
                      {task.contacts.company_name}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Metadata */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Created: {format(new Date(task.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
            {task.completed_at && (
              <p>Completed: {format(new Date(task.completed_at), "MMM d, yyyy 'at' h:mm a")}</p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleteTask.isPending}
          >
            {deleteTask.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
          
          <div className="flex-1" />
          
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          
          {task.status !== "done" && (
            <Button onClick={handleComplete} disabled={completeTask.isPending}>
              {completeTask.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Mark Complete
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
