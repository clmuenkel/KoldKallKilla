"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useRecentActivity } from "@/hooks/use-activity";
import { formatDistanceToNow } from "date-fns";
import { getInitials, cn } from "@/lib/utils";
import { 
  Phone, 
  Mail, 
  MessageSquare, 
  ArrowRight, 
  UserPlus, 
  RefreshCw,
  Calendar,
  PhoneCall,
  PhoneOff,
  PhoneMissed,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const activityConfig: Record<string, { 
  icon: React.ElementType; 
  bgColor: string; 
  textColor: string;
  label: string;
}> = {
  call: { 
    icon: Phone, 
    bgColor: "bg-blue-500/10", 
    textColor: "text-blue-600 dark:text-blue-400",
    label: "Call"
  },
  call_connected: { 
    icon: PhoneCall, 
    bgColor: "bg-emerald-500/10", 
    textColor: "text-emerald-600 dark:text-emerald-400",
    label: "Connected"
  },
  call_voicemail: { 
    icon: PhoneOff, 
    bgColor: "bg-amber-500/10", 
    textColor: "text-amber-600 dark:text-amber-400",
    label: "Voicemail"
  },
  call_no_answer: { 
    icon: PhoneMissed, 
    bgColor: "bg-red-500/10", 
    textColor: "text-red-600 dark:text-red-400",
    label: "No Answer"
  },
  email_sent: { 
    icon: Mail, 
    bgColor: "bg-indigo-500/10", 
    textColor: "text-indigo-600 dark:text-indigo-400",
    label: "Email Sent"
  },
  note_added: { 
    icon: MessageSquare, 
    bgColor: "bg-yellow-500/10", 
    textColor: "text-yellow-600 dark:text-yellow-400",
    label: "Note Added"
  },
  contact_created: { 
    icon: UserPlus, 
    bgColor: "bg-purple-500/10", 
    textColor: "text-purple-600 dark:text-purple-400",
    label: "New Contact"
  },
  stage_changed: { 
    icon: RefreshCw, 
    bgColor: "bg-orange-500/10", 
    textColor: "text-orange-600 dark:text-orange-400",
    label: "Stage Changed"
  },
  meeting_scheduled: { 
    icon: Calendar, 
    bgColor: "bg-pink-500/10", 
    textColor: "text-pink-600 dark:text-pink-400",
    label: "Meeting Scheduled"
  },
};

const defaultConfig = {
  icon: Activity,
  bgColor: "bg-muted",
  textColor: "text-muted-foreground",
  label: "Activity"
};

export function RecentActivity() {
  const { data: activities, isLoading } = useRecentActivity();

  if (isLoading) {
    return (
      <Card variant="elevated">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Recent Activity
        </CardTitle>
        <Link href="/contacts">
          <Button variant="ghost" size="sm" className="text-xs h-8">
            View All
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[320px] pr-4">
          {!activities || activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                <Activity className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground">No recent activity</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Activity will appear here</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline connector line */}
              <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
              
              <div className="space-y-1">
                {activities.map((activity, index) => {
                  const contact = activity.contacts;
                  const config = activityConfig[activity.activity_type] || defaultConfig;
                  const Icon = config.icon;
                  const contactName = contact 
                    ? `${contact.first_name} ${contact.last_name || ""}`.trim()
                    : "Unknown";

                  return (
                    <div 
                      key={activity.id} 
                      className={cn(
                        "relative flex items-start gap-3 p-2 rounded-lg transition-colors",
                        "hover:bg-muted/50 cursor-pointer group"
                      )}
                    >
                      {/* Avatar with Activity Icon overlay */}
                      <div className="relative shrink-0">
                        {contact ? (
                          <Avatar className="h-10 w-10 border-2 border-background">
                            <AvatarFallback className="text-xs bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                              {getInitials(contactName)}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            <Icon className={cn("h-4 w-4", config.textColor)} />
                          </div>
                        )}
                        {/* Activity type indicator */}
                        <div className={cn(
                          "absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full flex items-center justify-center ring-2 ring-background",
                          config.bgColor
                        )}>
                          <Icon className={cn("h-2.5 w-2.5", config.textColor)} />
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium leading-tight">
                              {activity.summary || config.label}
                            </p>
                            {contact && (
                              <Link
                                href={`/contacts/${activity.contact_id}`}
                                className="text-sm text-primary hover:underline block truncate"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {contactName}
                                {contact.company_name && (
                                  <span className="text-muted-foreground"> • {contact.company_name}</span>
                                )}
                              </Link>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 pt-0.5">
                            {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
