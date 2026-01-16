"use client";

import { Card, CardContent } from "@/components/ui/card";
import { RingProgress } from "@/components/ui/ring-progress";
import { Phone, PhoneCall, Calendar, Voicemail } from "lucide-react";
import { useTodayCallStats } from "@/hooks/use-calls";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number;
  goal: number;
  icon: React.ReactNode;
  color: string;
  ringColor: string;
  delay?: number;
}

function StatCard({ title, value, goal, icon, color, ringColor, delay = 0 }: StatCardProps) {
  const percentage = Math.min(Math.round((value / goal) * 100), 100);

  return (
    <Card 
      className="overflow-hidden min-h-[140px] opacity-0 animate-fade-in"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "forwards" }}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">{value}</span>
              <span className="text-sm text-muted-foreground">/ {goal}</span>
            </div>
          </div>
          <RingProgress
            value={value}
            max={goal}
            size={80}
            strokeWidth={6}
            color={ringColor}
          >
            <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", color)}>
              {icon}
            </div>
          </RingProgress>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {percentage >= 100 ? "Goal reached!" : `${100 - percentage}% to go`}
          </span>
          <span className={cn(
            "font-semibold",
            percentage >= 100 ? "text-green-500" : "text-muted-foreground"
          )}>
            {percentage}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card className="min-h-[140px]">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="h-20 w-20 rounded-full" />
        </div>
        <Skeleton className="h-4 w-full mt-4" />
      </CardContent>
    </Card>
  );
}

export function StatsCards() {
  const { data: callStats, isLoading } = useTodayCallStats();

  if (isLoading) {
    return (
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Calls Made"
        value={callStats?.total || 0}
        goal={50}
        icon={<Phone className="h-5 w-5 text-white" />}
        color="bg-blue-500"
        ringColor="hsl(217, 91%, 60%)"
        delay={0}
      />
      <StatCard
        title="Connected"
        value={callStats?.connected || 0}
        goal={15}
        icon={<PhoneCall className="h-5 w-5 text-white" />}
        color="bg-green-500"
        ringColor="hsl(142, 71%, 45%)"
        delay={50}
      />
      <StatCard
        title="Meetings Booked"
        value={callStats?.meetingsBooked || 0}
        goal={3}
        icon={<Calendar className="h-5 w-5 text-white" />}
        color="bg-purple-500"
        ringColor="hsl(263, 70%, 50%)"
        delay={100}
      />
      <StatCard
        title="Voicemails"
        value={callStats?.voicemail || 0}
        goal={20}
        icon={<Voicemail className="h-5 w-5 text-white" />}
        color="bg-orange-500"
        ringColor="hsl(25, 95%, 53%)"
        delay={150}
      />
    </div>
  );
}
