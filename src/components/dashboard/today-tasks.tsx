"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTodayTasks, useCompleteTask } from "@/hooks/use-tasks";
import { format, isPast, isToday } from "date-fns";
import { ArrowRight, CheckSquare } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function TodayTasks() {
  const { data: tasks, isLoading } = useTodayTasks();
  const completeTask = useCompleteTask();

  const handleComplete = (taskId: string) => {
    completeTask.mutate(taskId);
  };

  if (isLoading) {
    return (
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Today&apos;s Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const overdueTasks = (tasks ?? []).filter(
    (t) => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date))
  );

  return (
    <Card variant="elevated">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5" />
          Today&apos;s Tasks
          {overdueTasks.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {overdueTasks.length} overdue
            </Badge>
          )}
        </CardTitle>
        <Link href="/tasks">
          <Button variant="ghost" size="sm">
            View All
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {!tasks || tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No tasks due today. Great job! 🎉
          </p>
        ) : (
          <div className="space-y-3">
            {tasks.slice(0, 5).map((task) => {
              const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date));
              const contact = task.contacts;

              return (
                <div
                  key={task.id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-3 transition-colors",
                    isOverdue ? "border-destructive/30 bg-destructive/5 dark:bg-destructive/10" : "hover:bg-muted/50"
                  )}
                >
                  <Checkbox
                    checked={task.status === "done"}
                    onCheckedChange={() => handleComplete(task.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{task.title}</p>
                    {contact && (
                      <p className="text-sm text-muted-foreground truncate">
                        {contact.first_name} {contact.last_name}
                        {contact.company_name && ` • ${contact.company_name}`}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    {task.due_date && (
                      <p className={cn(
                        "text-xs",
                        isOverdue ? "text-destructive font-medium" : "text-muted-foreground"
                      )}>
                        {isOverdue ? "Overdue" : format(new Date(task.due_date), "h:mm a")}
                      </p>
                    )}
                    <Badge variant="outline" className="text-xs mt-1">
                      {task.type}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
