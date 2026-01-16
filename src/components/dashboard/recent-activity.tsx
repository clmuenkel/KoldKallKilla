"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecentActivity } from "@/hooks/use-activity";
import { formatDistanceToNow } from "date-fns";
import { Phone, Mail, MessageSquare, ArrowRight, UserPlus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const activityIcons: Record<string, React.ReactNode> = {
  call: <Phone className="h-4 w-4" />,
  email_sent: <Mail className="h-4 w-4" />,
  note_added: <MessageSquare className="h-4 w-4" />,
  contact_created: <UserPlus className="h-4 w-4" />,
  stage_changed: <RefreshCw className="h-4 w-4" />,
};

const activityColors: Record<string, string> = {
  call: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
  email_sent: "bg-green-500/20 text-green-600 dark:text-green-400",
  note_added: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400",
  contact_created: "bg-purple-500/20 text-purple-600 dark:text-purple-400",
  stage_changed: "bg-orange-500/20 text-orange-600 dark:text-orange-400",
};

export function RecentActivity() {
  const { data: activities, isLoading } = useRecentActivity();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Activity</CardTitle>
        <Link href="/contacts">
          <Button variant="ghost" size="sm">
            View All
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          {!activities || activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No recent activity
            </p>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => {
                const contact = activity.contacts as any;
                const icon = activityIcons[activity.activity_type] || <MessageSquare className="h-4 w-4" />;
                const colorClass = activityColors[activity.activity_type] || "bg-muted text-muted-foreground";

                return (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className={`h-8 w-8 rounded-full ${colorClass} flex items-center justify-center flex-shrink-0`}>
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">
                          {activity.summary || activity.activity_type}
                        </span>
                      </p>
                      {contact && (
                        <Link
                          href={`/contacts/${activity.contact_id}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {contact.first_name} {contact.last_name}
                          {contact.company_name && ` • ${contact.company_name}`}
                        </Link>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
