"use client";

import { useActivity } from "@/hooks/use-activity";
import { formatDistanceToNow, format } from "date-fns";
import { Phone, Mail, MessageSquare, UserPlus, RefreshCw, CheckSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const activityConfig: Record<
  string,
  { icon: React.ReactNode; color: string; bgColor: string }
> = {
  call: {
    icon: <Phone className="h-4 w-4" />,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/20",
  },
  email_sent: {
    icon: <Mail className="h-4 w-4" />,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-500/20",
  },
  note_added: {
    icon: <MessageSquare className="h-4 w-4" />,
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-500/20",
  },
  contact_created: {
    icon: <UserPlus className="h-4 w-4" />,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-500/20",
  },
  stage_changed: {
    icon: <RefreshCw className="h-4 w-4" />,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-500/20",
  },
  task_created: {
    icon: <CheckSquare className="h-4 w-4" />,
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-500/20",
  },
  task_completed: {
    icon: <CheckSquare className="h-4 w-4" />,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-500/20",
  },
};

interface ActivityTimelineProps {
  contactId: string;
}

export function ActivityTimeline({ contactId }: ActivityTimelineProps) {
  const { data: activities, isLoading } = useActivity({ contactId, limit: 50 });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No activity yet
      </p>
    );
  }

  // Group activities by date
  const groupedActivities = activities.reduce((groups, activity) => {
    const date = format(new Date(activity.created_at), "yyyy-MM-dd");
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(activity);
    return groups;
  }, {} as Record<string, typeof activities>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedActivities).map(([date, dayActivities]) => (
        <div key={date}>
          <h4 className="text-sm font-medium text-muted-foreground mb-4">
            {format(new Date(date), "EEEE, MMMM d, yyyy")}
          </h4>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

            <div className="space-y-4">
              {dayActivities.map((activity, index) => {
                const config = activityConfig[activity.activity_type] || {
                  icon: <MessageSquare className="h-4 w-4" />,
                  color: "text-muted-foreground",
                  bgColor: "bg-muted",
                };
                const metadata = activity.metadata as any;

                return (
                  <div key={activity.id} className="relative flex gap-4 pl-2">
                    {/* Icon */}
                    <div
                      className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center z-10",
                        config.bgColor,
                        config.color
                      )}
                    >
                      {config.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-4">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">
                          {activity.summary || activity.activity_type.replace("_", " ")}
                        </p>
                        <time className="text-sm text-muted-foreground">
                          {format(new Date(activity.created_at), "h:mm a")}
                        </time>
                      </div>

                      {/* Call-specific details */}
                      {activity.activity_type === "call" && metadata && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          {metadata.duration && (
                            <span>
                              Duration: {Math.floor(metadata.duration / 60)}:
                              {(metadata.duration % 60).toString().padStart(2, "0")}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Notes from call */}
                      {activity.activity_type === "call" && metadata?.notes && (
                        <div className="mt-2 p-3 rounded-lg bg-muted text-sm">
                          {metadata.notes}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
