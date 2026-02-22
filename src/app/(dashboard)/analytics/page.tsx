"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Phone,
  PhoneCall,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Flame,
  Target,
  BarChart3,
  PieChart,
  Activity,
  Globe,
  Zap,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import {
  useAnalyticsSummary,
  useDailyStats,
  useOutcomeBreakdown,
  useDispositionBreakdown,
  useTimezonePerformance,
  useCallingStreak,
  useWeekComparison,
} from "@/hooks/use-analytics";
import { useSessions, useEndAllOpenSessions } from "@/hooks/use-sessions";
import { useTargets } from "@/hooks/use-targets";
import type { DateRange, TrendDataPoint, SessionWithStats } from "@/types/analytics";
import { cn } from "@/lib/utils";
import { DISPOSITION_LABEL_MAP } from "@/lib/constants";
import { toast } from "sonner";

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This Week" },
  { value: "last_week", label: "Last Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
];

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>("this_week");

  const { data: summary, isLoading: loadingSummary } = useAnalyticsSummary(dateRange);
  const { data: dailyStats, isLoading: loadingDaily } = useDailyStats(14);
  const { data: outcomes, isLoading: loadingOutcomes } = useOutcomeBreakdown(dateRange);
  const { data: dispositions } = useDispositionBreakdown(dateRange);
  const { data: timezones } = useTimezonePerformance();
  const { data: streak } = useCallingStreak();
  const { data: weekComparison } = useWeekComparison();
  const { data: sessions } = useSessions({ limit: 10 });
  const { data: targets } = useTargets();
  const endAllOpenSessions = useEndAllOpenSessions();

  return (
    <div className="flex flex-col h-full">
      <Header title="Analytics" />

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header with Date Range */}
          <PageHeader
            title="Performance Analytics"
            description="Track your cold calling performance and identify trends"
            actions={
              <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_RANGE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          />

          {/* Streak Banner */}
          {streak && streak.currentStreak > 0 && (
            <Card className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-200 dark:border-orange-800">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                  <Flame className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <p className="font-semibold text-lg">
                    {streak.currentStreak} Day Streak! 🔥
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Keep it going! Longest streak: {streak.longestStreak} days
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Key Metrics */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
            <MetricCard
              title="Total Calls"
              value={summary?.totalCalls || 0}
              icon={<Phone className="h-4 w-4" />}
              loading={loadingSummary}
              comparison={weekComparison?.changes.totalCalls}
            />
            <MetricCard
              title="Connected"
              value={summary?.connectedCalls || 0}
              icon={<PhoneCall className="h-4 w-4" />}
              loading={loadingSummary}
              comparison={weekComparison?.changes.connectedCalls}
            />
            <MetricCard
              title="Meetings"
              value={summary?.meetingsBooked || 0}
              icon={<Calendar className="h-4 w-4" />}
              loading={loadingSummary}
              comparison={weekComparison?.changes.meetingsBooked}
            />
            <MetricCard
              title="Answer Rate"
              value={summary?.answerRate || 0}
              suffix="%"
              icon={<Target className="h-4 w-4" />}
              loading={loadingSummary}
              comparison={weekComparison?.changes.answerRate}
            />
            <MetricCard
              title="Set Rate"
              value={summary?.setRate || 0}
              suffix="%"
              icon={<Zap className="h-4 w-4" />}
              loading={loadingSummary}
              comparison={weekComparison?.changes.setRate}
            />
            <MetricCard
              title="Session Time"
              value={Math.round((summary?.totalSessionTime || 0) / 60)}
              suffix=" min"
              icon={<Clock className="h-4 w-4" />}
              loading={loadingSummary}
            />
          </div>

          {/* Charts Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Daily Trend (14 days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingDaily ? (
                  <Skeleton className="h-[200px] w-full" />
                ) : (
                  <SimpleTrendChart data={dailyStats || []} />
                )}
              </CardContent>
            </Card>

            {/* Outcome Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <PieChart className="h-4 w-4" />
                  Outcome Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingOutcomes ? (
                  <Skeleton className="h-[200px] w-full" />
                ) : (
                  <OutcomeChart outcomes={outcomes || []} />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Second Row */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Timezone Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  By Timezone
                </CardTitle>
                <CardDescription>Connection rate by timezone</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {timezones?.slice(0, 5).map((tz) => (
                    <div key={tz.timezone} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate max-w-[120px]">
                          {tz.timezone.replace("America/", "").replace("_", " ")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({tz.total_calls} calls)
                        </span>
                      </div>
                      <Badge variant={tz.answer_rate && tz.answer_rate >= 20 ? "default" : "secondary"}>
                        {tz.answer_rate || 0}%
                      </Badge>
                    </div>
                  ))}
                  {(!timezones || timezones.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No timezone data yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Disposition Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Connected Results
                </CardTitle>
                <CardDescription>What happened on connected calls</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dispositions?.map((d) => (
                    <div key={d.disposition} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>
                          {DISPOSITION_LABEL_MAP[d.disposition] || d.disposition.replace(/_/g, " ")}
                        </span>
                        <span className="text-muted-foreground">{d.count}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${d.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {(!dispositions || dispositions.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No disposition data yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Weekly Goals Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Weekly Goals
                </CardTitle>
                <CardDescription>Progress toward weekly targets</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <GoalProgress
                    label="Calls"
                    current={weekComparison?.current.totalCalls || 0}
                    target={targets?.weekly?.calls_target || 250}
                  />
                  <GoalProgress
                    label="Connected"
                    current={weekComparison?.current.connectedCalls || 0}
                    target={targets?.weekly?.connected_target || 75}
                  />
                  <GoalProgress
                    label="Meetings"
                    current={weekComparison?.current.meetingsBooked || 0}
                    target={targets?.weekly?.meetings_target || 15}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sessions History */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Recent Sessions
                  </CardTitle>
                  <CardDescription>
                    Auto-detected calling sessions (30+ min gap = new session)
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={endAllOpenSessions.isPending}
                  onClick={() => {
                    endAllOpenSessions.mutate(undefined, {
                      onSuccess: (result) => {
                        if (result?.count) toast.success(`Ended ${result.count} open session(s).`);
                        else toast.info("No open sessions to end.");
                      },
                      onError: () => toast.error("Failed to end sessions."),
                    });
                  }}
                >
                  {endAllOpenSessions.isPending ? "Ending…" : "End all open sessions"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {sessions && sessions.length > 0 ? (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <SessionRow key={session.id} session={session} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No sessions recorded yet. Start calling to see your session history!
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Sub-components
// ============================================

function MetricCard({
  title,
  value,
  suffix = "",
  icon,
  loading,
  comparison,
}: {
  title: string;
  value: number;
  suffix?: string;
  icon: React.ReactNode;
  loading?: boolean;
  comparison?: number;
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-4 w-16 mb-2" />
          <Skeleton className="h-8 w-12" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">{title}</span>
          <span className="text-muted-foreground">{icon}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">
            {value}{suffix}
          </span>
          {comparison !== undefined && comparison !== 0 && (
            <span className={cn(
              "text-xs flex items-center",
              comparison > 0 ? "text-green-500" : "text-red-500"
            )}>
              {comparison > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(comparison)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SimpleTrendChart({ data }: { data: TrendDataPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-muted-foreground">
        No data available
      </div>
    );
  }

  const maxCalls = Math.max(...data.map((d) => d.calls), 1);

  return (
    <div className="h-[200px] flex items-end gap-1">
      {data.map((day, i) => {
        const height = (day.calls / maxCalls) * 100;
        const isToday = i === data.length - 1;
        
        return (
          <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex flex-col items-center">
              {day.calls > 0 && (
                <span className="text-[10px] text-muted-foreground mb-1">
                  {day.calls}
                </span>
              )}
              <div
                className={cn(
                  "w-full rounded-t transition-all",
                  isToday ? "bg-primary" : "bg-primary/60",
                  day.calls === 0 && "bg-muted"
                )}
                style={{ height: `${Math.max(height, 4)}%` }}
                title={`${format(new Date(day.date), "MMM d")}: ${day.calls} calls, ${day.answerRate}% answer rate`}
              />
            </div>
            <span className="text-[9px] text-muted-foreground">
              {format(new Date(day.date), "d")}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function OutcomeChart({ outcomes }: { outcomes: { outcome: string; count: number; percentage: number; color: string }[] }) {
  if (outcomes.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-muted-foreground">
        No calls recorded
      </div>
    );
  }

  const total = outcomes.reduce((sum, o) => sum + o.count, 0);

  return (
    <div className="space-y-4">
      {/* Simple bar representation */}
      <div className="h-8 flex rounded-full overflow-hidden">
        {outcomes.map((outcome) => (
          <div
            key={outcome.outcome}
            className="h-full transition-all"
            style={{
              width: `${outcome.percentage}%`,
              backgroundColor: outcome.color,
            }}
            title={`${outcome.outcome}: ${outcome.count} (${outcome.percentage}%)`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2">
        {outcomes.map((outcome) => (
          <div key={outcome.outcome} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: outcome.color }}
            />
            <span className="text-xs truncate capitalize">
              {outcome.outcome.replace(/_/g, " ")}
            </span>
            <span className="text-xs text-muted-foreground ml-auto">
              {outcome.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GoalProgress({
  label,
  current,
  target,
}: {
  label: string;
  current: number;
  target: number;
}) {
  const percentage = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
  const isComplete = percentage >= 100;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className={cn(
          "font-medium",
          isComplete && "text-green-500"
        )}>
          {current} / {target}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            isComplete ? "bg-green-500" : "bg-primary"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function SessionRow({ session }: { session: SessionWithStats }) {
  const duration = session.duration_seconds
    ? `${Math.floor(session.duration_seconds / 3600)}h ${Math.floor((session.duration_seconds % 3600) / 60)}m`
    : "In progress";

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-4">
        <div className="text-center">
          <p className="text-sm font-medium">
            {format(new Date(session.started_at), "MMM d")}
          </p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(session.started_at), "h:mm a")}
          </p>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-lg font-bold">{session.total_calls}</p>
            <p className="text-[10px] text-muted-foreground">Calls</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-green-500">{session.connected_calls}</p>
            <p className="text-[10px] text-muted-foreground">Connected</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-purple-500">{session.meetings_booked}</p>
            <p className="text-[10px] text-muted-foreground">Meetings</p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 text-right">
        <div>
          <Badge variant="outline" className="font-mono">
            {session.answer_rate}% answer
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground">
          {duration}
        </div>
      </div>
    </div>
  );
}
