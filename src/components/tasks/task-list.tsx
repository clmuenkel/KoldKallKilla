"use client";

import { useState } from "react";
import { useTasks, useCompleteTask, useDeleteTask } from "@/hooks/use-tasks";
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
import { TASK_TYPES, TASK_PRIORITIES } from "@/lib/constants";
import { format, isPast, isToday, isTomorrow, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { MoreHorizontal, Trash2, Calendar, Clock, User } from "lucide-react";
import { toast } from "sonner";

interface TaskListProps {
  filter?: "all" | "today" | "upcoming" | "completed";
}

export function TaskList({ filter = "all" }: TaskListProps) {
  const { data: tasks, isLoading } = useTasks({
    status: filter === "completed" ? "done" : "todo",
  });
  const completeTask = useCompleteTask();
  const deleteTask = useDeleteTask();

  const handleComplete = async (taskId: string) => {
    try {
      await completeTask.mutateAsync(taskId);
      toast.success("Task completed!");
    } catch (error) {
      toast.error("Failed to complete task");
    }
  };

  const handleDelete = async (taskId: string) => {
    if (confirm("Are you sure you want to delete this task?")) {
      try {
        await deleteTask.mutateAsync(taskId);
        toast.success("Task deleted");
      } catch (error) {
        toast.error("Failed to delete task");
      }
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
      <div className="text-center py-12">
        <p className="text-muted-foreground">No tasks found</p>
      </div>
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
          variant === "destructive" && "text-red-600",
          variant === "warning" && "text-yellow-600"
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
        variant === "destructive" && "border-red-200 bg-red-50",
        variant === "warning" && "border-yellow-200 bg-yellow-50"
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
              {contact && (
                <Link
                  href={`/contacts/${task.contact_id}`}
                  className="flex items-center gap-1 hover:text-primary"
                >
                  <User className="h-3 w-3" />
                  {contact.first_name} {contact.last_name}
                </Link>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
