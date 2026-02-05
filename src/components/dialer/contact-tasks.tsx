"use client";

import { useState } from "react";
import { useTasks, useCompleteTask, useCreateTask } from "@/hooks/use-tasks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  Loader2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { format, isToday, isTomorrow, isPast } from "date-fns";
import { addBusinessDays } from "@/lib/utils";
import type { Contact, Task } from "@/types/database";

interface ContactTasksProps {
  contact: Contact;
  colleagues?: Contact[];
  userId: string;
}

export function ContactTasks({ contact, colleagues = [], userId }: ContactTasksProps) {
  const { data: tasks, isLoading } = useTasks({ contactId: contact.id });
  const completeTask = useCompleteTask();
  const createTask = useCreateTask();
  const [createdTasks, setCreatedTasks] = useState<Set<string>>(new Set());

  const pendingTasks = tasks?.filter(t => t.status === "todo" || t.status === "pending") || [];

  const handleQuickTask = async (type: "call" | "email" | "meeting", daysFromNow: number) => {
    const taskKey = `${type}-${daysFromNow}`;
    if (createdTasks.has(taskKey)) {
      toast.info("Task already created");
      return;
    }

    const dueDate = format(addBusinessDays(new Date(), daysFromNow), "yyyy-MM-dd");
    const taskTitles: Record<string, string> = {
      call: `Follow up call with ${contact.first_name}`,
      email: `Send email to ${contact.first_name}`,
      meeting: `Schedule meeting with ${contact.first_name}`,
    };

    try {
      await createTask.mutateAsync({
        user_id: userId,
        contact_id: contact.id,
        title: taskTitles[type],
        type,
        priority: "medium",
        status: "todo",
        due_date: dueDate,
      });

      setCreatedTasks(prev => new Set(prev).add(taskKey));
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} task created!`);
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

  const getTaskIcon = (type: string) => {
    switch (type) {
      case "call": return <Phone className="h-3 w-3" />;
      case "email": return <Mail className="h-3 w-3" />;
      case "meeting": return <Calendar className="h-3 w-3" />;
      default: return <Circle className="h-3 w-3" />;
    }
  };

  const getDueBadge = (dueDate: string | null) => {
    if (!dueDate) return null;
    const date = new Date(dueDate);
    
    if (isPast(date) && !isToday(date)) {
      return <Badge variant="destructive" className="text-[10px] px-1 py-0">Overdue</Badge>;
    }
    if (isToday(date)) {
      return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] px-1 py-0">Today</Badge>;
    }
    if (isTomorrow(date)) {
      return <Badge variant="secondary" className="text-[10px] px-1 py-0">Tomorrow</Badge>;
    }
    return <Badge variant="outline" className="text-[10px] px-1 py-0">{format(date, "MMM d")}</Badge>;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b mb-2">
        <h3 className="text-sm font-semibold">Tasks</h3>
        {pendingTasks.length > 0 && (
          <Badge variant="secondary" className="text-xs">{pendingTasks.length}</Badge>
        )}
      </div>

      {/* Quick Task Buttons */}
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        <QuickButton
          icon={Phone}
          label="1 day"
          onClick={() => handleQuickTask("call", 1)}
          created={createdTasks.has("call-1")}
          isPending={createTask.isPending}
        />
        <QuickButton
          icon={Phone}
          label="3 days"
          onClick={() => handleQuickTask("call", 3)}
          created={createdTasks.has("call-3")}
          isPending={createTask.isPending}
        />
        <QuickButton
          icon={Phone}
          label="1 week"
          onClick={() => handleQuickTask("call", 7)}
          created={createdTasks.has("call-7")}
          isPending={createTask.isPending}
        />
      </div>

      <div className="grid grid-cols-2 gap-1.5 mb-3">
        <QuickButton
          icon={Mail}
          label="Email"
          onClick={() => handleQuickTask("email", 0)}
          created={createdTasks.has("email-0")}
          isPending={createTask.isPending}
        />
        <QuickButton
          icon={Calendar}
          label="Meeting"
          onClick={() => handleQuickTask("meeting", 1)}
          created={createdTasks.has("meeting-1")}
          isPending={createTask.isPending}
        />
      </div>

      {/* Colleagues quick action */}
      {colleagues.length > 0 && (
        <Button variant="outline" size="sm" className="w-full mb-3 h-7 text-xs gap-1">
          <Users className="h-3 w-3" />
          Call colleague ({colleagues.length})
        </Button>
      )}

      {/* Task List */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : pendingTasks.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No pending tasks
            </p>
          ) : (
            <div className="space-y-1.5 pr-2">
              {pendingTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start gap-2 p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors group"
                >
                  <button
                    onClick={() => handleCompleteTask(task.id)}
                    className="mt-0.5 text-muted-foreground hover:text-green-500 transition-colors"
                    disabled={completeTask.isPending}
                  >
                    {completeTask.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Circle className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {getTaskIcon(task.type || "task")}
                      <span className="text-xs font-medium truncate">{task.title}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      {getDueBadge(task.due_date)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}

function QuickButton({
  icon: Icon,
  label,
  onClick,
  created,
  isPending,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  created: boolean;
  isPending: boolean;
}) {
  if (created) {
    return (
      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" disabled>
        <CheckCircle2 className="h-3 w-3 text-green-500" />
        <span className="text-[10px]">Done</span>
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={isPending}
      className="h-7 text-xs gap-1"
    >
      {isPending ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Icon className="h-3 w-3" />
      )}
      <span className="text-[10px]">{label}</span>
    </Button>
  );
}
