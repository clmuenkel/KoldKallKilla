"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { RingProgress } from "@/components/ui/ring-progress";
import { Phone, PhoneCall, Calendar, Voicemail, TrendingUp, TrendingDown } from "lucide-react";
import { useTodayCallStats } from "@/hooks/use-calls";
import { useMeetingsBookedToday } from "@/hooks/use-meetings";
import { useDailyTargets, useUpdateTarget } from "@/hooks/use-targets";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { EditableTarget } from "./editable-target";

interface StatCardProps {
  title: string;
  value: number;
  goal: number;
  icon: React.ReactNode;
  color: string;
  ringColor: string;
  delay?: number;
  onEditGoal?: (value: number) => Promise<void>;
  isPending?: boolean;
  trend?: number; // Percentage change from yesterday
}

// Animated number component
function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const [displayValue, setDisplayValue] = useState(0);
  const previousValue = useRef(0);
  const animationRef = useRef<number>();

  useEffect(() => {
    const startValue = previousValue.current;
    const endValue = value;
    const duration = 600;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      
      const currentValue = Math.round(startValue + (endValue - startValue) * easeOutQuart);
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        previousValue.current = endValue;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value]);

  return <span className={className}>{displayValue}</span>;
}

function StatCard({ 
  title, 
  value, 
  goal, 
  icon, 
  color, 
  ringColor, 
  delay = 0,
  onEditGoal,
  isPending,
  trend,
}: StatCardProps) {
  const percentage = goal > 0 ? Math.min(Math.round((value / goal) * 100), 100) : 0;
  const isGoalReached = percentage >= 100;

  return (
    <Card 
      variant="elevated"
      className={cn(
        "overflow-hidden min-h-[160px] opacity-0 animate-fade-in group",
        isGoalReached && "ring-2 ring-emerald-500/30"
      )}
      style={{ animationDelay: `${delay}ms`, animationFillMode: "forwards" }}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <AnimatedNumber 
                value={value} 
                className="text-4xl font-bold tracking-tight" 
              />
              <span className="text-muted-foreground text-lg">/</span>
              {onEditGoal ? (
                <EditableTarget
                  value={goal}
                  label={title}
                  onSave={onEditGoal}
                  isPending={isPending}
                />
              ) : (
                <span className="text-muted-foreground text-lg">{goal}</span>
              )}
            </div>
            
            {/* Trend indicator */}
            {trend !== undefined && (
              <div className={cn(
                "flex items-center gap-1 text-xs font-medium",
                trend > 0 ? "text-emerald-600 dark:text-emerald-400" : 
                trend < 0 ? "text-red-600 dark:text-red-400" : 
                "text-muted-foreground"
              )}>
                {trend > 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : trend < 0 ? (
                  <TrendingDown className="h-3 w-3" />
                ) : null}
                <span>
                  {trend > 0 ? "+" : ""}{trend}% vs yesterday
                </span>
              </div>
            )}
          </div>
          
          <RingProgress
            value={value}
            max={goal}
            size={72}
            strokeWidth={5}
            color={ringColor}
          >
            <div className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110",
              color
            )}>
              {icon}
            </div>
          </RingProgress>
        </div>
        
        {/* Progress footer */}
        <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs">
          <span className={cn(
            "font-medium",
            isGoalReached ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
          )}>
            {isGoalReached ? "Goal reached!" : `${100 - percentage}% to go`}
          </span>
          <div className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-full",
            isGoalReached 
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
              : percentage >= 50 
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                : "bg-muted text-muted-foreground"
          )}>
            <span className="font-bold">{percentage}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card variant="elevated" className="min-h-[160px]">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3 flex-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-[72px] w-[72px] rounded-full" />
        </div>
        <div className="mt-4 pt-3 border-t flex justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-12 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

export function StatsCards() {
  const { data: callStats, isLoading: loadingCalls } = useTodayCallStats();
  const { data: meetingsBookedToday, isLoading: loadingMeetings } = useMeetingsBookedToday();
  const { data: targets, isLoading: loadingTargets } = useDailyTargets();
  const updateTarget = useUpdateTarget();

  const isLoading = loadingCalls || loadingMeetings || loadingTargets;

  // Helper to update a specific target
  const updateCallsTarget = async (value: number) => {
    await updateTarget.mutateAsync({
      targetType: "daily",
      updates: { calls_target: value },
    });
  };

  const updateConnectedTarget = async (value: number) => {
    await updateTarget.mutateAsync({
      targetType: "daily",
      updates: { connected_target: value },
    });
  };

  const updateMeetingsTarget = async (value: number) => {
    await updateTarget.mutateAsync({
      targetType: "daily",
      updates: { meetings_target: value },
    });
  };

  const updateVoicemailsTarget = async (value: number) => {
    await updateTarget.mutateAsync({
      targetType: "daily",
      updates: { voicemails_target: value },
    });
  };

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
        goal={targets?.calls_target || 50}
        icon={<Phone className="h-5 w-5 text-white" />}
        color="bg-gradient-to-br from-blue-500 to-blue-600"
        ringColor="hsl(217, 91%, 60%)"
        delay={0}
        onEditGoal={updateCallsTarget}
        isPending={updateTarget.isPending}
      />
      <StatCard
        title="Connected"
        value={callStats?.connected || 0}
        goal={targets?.connected_target || 15}
        icon={<PhoneCall className="h-5 w-5 text-white" />}
        color="bg-gradient-to-br from-emerald-500 to-emerald-600"
        ringColor="hsl(142, 71%, 45%)"
        delay={50}
        onEditGoal={updateConnectedTarget}
        isPending={updateTarget.isPending}
      />
      <StatCard
        title="Meetings Booked"
        value={meetingsBookedToday || 0}
        goal={targets?.meetings_target || 3}
        icon={<Calendar className="h-5 w-5 text-white" />}
        color="bg-gradient-to-br from-purple-500 to-purple-600"
        ringColor="hsl(263, 70%, 50%)"
        delay={100}
        onEditGoal={updateMeetingsTarget}
        isPending={updateTarget.isPending}
      />
      <StatCard
        title="Voicemails"
        value={callStats?.voicemail || 0}
        goal={targets?.voicemails_target || 20}
        icon={<Voicemail className="h-5 w-5 text-white" />}
        color="bg-gradient-to-br from-orange-500 to-orange-600"
        ringColor="hsl(25, 95%, 53%)"
        delay={150}
        onEditGoal={updateVoicemailsTarget}
        isPending={updateTarget.isPending}
      />
    </div>
  );
}
