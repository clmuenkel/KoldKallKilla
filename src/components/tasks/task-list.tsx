"use client";

import { useState } from "react";
import { useTasks, useCompleteTask, useDeleteTask, useCreateTask } from "@/hooks/use-tasks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { TASK_TYPES, TASK_PRIORITIES } from "@/lib/constants";
import { format, isPast, isToday, isTomorrow, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { MoreHorizontal, Trash2, Calendar, Clock, User, CheckSquare } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";

interface TaskListProps {
  filter?: "all" | "today" | "upcoming" | "completed";
}

export function TaskList({ filter = "all" }: TaskListProps) {
  const { data: tasks, isLoading } = useTasks({
    status: filter === "completed" ? "done" : "todo",
  });
  const completeTask = useCompleteTask();
  const deleteTask = useDeleteTask();
  const createTask = useCreateTask();

  const handleComplete = async (taskId: string) => {
    try {
      await completeTask.mutateAsync(taskId);
      toast.success("Task completed!");
    } catch (error) {
      toast.error("Failed to complete task");
    }
  };

  const handleDelete = async (taskId: string) => {
    // Find the task data before deleting for undo functionality
    const taskToDelete = tasks?.find(t => t.id === taskId);
    
    try {
      await deleteTask.mutateAsync(taskId);
      toast.success("Task deleted", {
        action: taskToDelete ? {
          label: "Undo",
          onClick: async () => {
            try {
              await createTask.mutateAsync({
                user_id: taskToDelete.user_id,
                title: taskToDelete.title,
                description: taskToDelete.description,
                type: taskToDelete.type,
                priority: taskToDelete.priority,
                due_date: taskToDelete.due_date,
                contact_id: taskToDelete.contact_id,
                status: taskToDelete.status,
              });
              toast.success("Task restored");
            } catch {
              toast.error("Failed to restore task");
            }
          },
        } : undefined,
      });
    } catch (error) {
      toast.error("Failed to delete task");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  // Filter tasks based on filter type
  let filteredTasks = tasks || [];
  if (filter === "today") {
    filteredTasks = filteredTasks.filter(
      (t) => t.due_date && (isToday(parseISO(t.due_date)) || isPast(parseISO(t.due_date)))
    );
  } else if (filter === "upcoming") {
    filteredTasks = filteredTasks.filter(
      (t) => t.due_date && !isToday(parseISO(t.due_date)) && !isPast(parseISO(t.due_date))
    );
  }

  // Group tasks
  const overdue = filteredTasks.filter(
    (t) => t.due_date && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date))
  );
  const today = filteredTasks.filter((t) => t.due_date && isToday(parseISO(t.due_date)));
  const tomorrow = filteredTasks.filter((t) => t.due_date && isTomorrow(parseISO(t.due_date)));
  const later = filteredTasks.filter(
    (t) =>
      !t.due_date ||
      (!isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date)) && !isTomorrow(parseISO(t.due_date)))
  );

  if (filteredTasks.length === 0) {
    return (
      <EmptyState
        icon={CheckSquare}
        title="No tasks found"
        description={filter === "completed" ? "Complete some tasks to see them here" : "Create a task to get started"}
      />
    );
  }

  return (
    <div className="space-y-6">
      {overdue.length > 0 && (
        <TaskGroup
          title="Overdue"
          tasks={overdue}
          variant="destructive"
          onComplete={handleComplete}
          onDelete={handleDelete}
        />
      )}
      {today.length > 0 && (
        <TaskGroup
          title="Today"
          tasks={today}
          variant="warning"
          onComplete={handleComplete}
          onDelete={handleDelete}
        />
      )}
      {tomorrow.length > 0 && (
        <TaskGroup
          title="Tomorrow"
          tasks={tomorrow}
          onComplete={handleComplete}
          onDelete={handleDelete}
        />
      )}
      {later.length > 0 && (
        <TaskGroup
          title="Later"
          tasks={later}
          onComplete={handleComplete}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

function TaskGroup({
  title,
  tasks,
  variant,
  onComplete,
  onDelete,
}: {
  title: string;
  tasks: any[];
  variant?: "destructive" | "warning";
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div>
      <h3
        className={cn(
          "text-sm font-semibold mb-3",
          variant === "destructive" && "text-destructive",
          variant === "warning" && "text-amber-600 dark:text-amber-500"
        )}
      >
        {title} ({tasks.length})
      </h3>
      <div className="space-y-2">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            variant={variant}
            onComplete={onComplete}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

function TaskItem({
  task,
  variant,
  onComplete,
  onDelete,
}: {
  task: any;
  variant?: "destructive" | "warning";
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const taskType = TASK_TYPES.find((t) => t.value === task.type);
  const priority = TASK_PRIORITIES.find((p) => p.value === task.priority);
  const contact = task.contacts;

  return (
    <Card
      className={cn(
        variant === "destructive" && "border-destructive/30 bg-destructive/5 dark:bg-destructive/10",
        variant === "warning" && "border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={task.status === "done"}
            onCheckedChange={() => onComplete(task.id)}
            className="mt-1"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium">{task.title}</p>
              {taskType && (
                <Badge variant="outline" className="text-xs">
                  {taskType.icon} {taskType.label}
                </Badge>
              )}
              {priority && priority.value !== "medium" && (
                <Badge
                  variant={priority.value === "urgent" ? "destructive" : "outline"}
                  className={cn("text-xs", priority.color)}
                >
                  {priority.label}
                </Badge>
              )}
            </div>
            {task.description && (
              <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              {task.due_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(parseISO(task.due_date), "MMM d, yyyy")}
                </div>
              )}
              {(contact || (task.task_contacts?.length ?? 0) > 0) && (
                <div className="flex items-center gap-1 flex-wrap">
                  {contact && (
                    <Link
                      href={`/contacts/${task.contact_id}`}
                      className="flex items-center gap-1 hover:text-primary"
                    >
                      <User className="h-3 w-3" />
                      {contact.first_name} {contact.last_name}
                    </Link>
                  )}
                  {task.task_contacts?.length ? (
                    <span className="text-muted-foreground">
                      {contact ? ", " : ""}and {task.task_contacts.length} more
                    </span>
                  ) : null}
                </div>
              )}
            </div>
          </div>
          <AlertDialog>
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Task actions</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end">
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem 
                    className="text-destructive"
                    onSelect={(e) => e.preventDefault()}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </AlertDialogTrigger>
              </DropdownMenuContent>
            </DropdownMenu>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Task</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this task? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(task.id)}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
