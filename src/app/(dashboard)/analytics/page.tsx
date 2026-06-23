"use client";

import { useState } from "react";
import Link from "next/link";
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
  CalendarX,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  PieChart as RPieChart,
  Pie,
  Cell,
  BarChart,
  Legend,
} from "recharts";
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
import { BestTimeToCall } from "@/components/analytics/best-time-to-call";
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
  { value: "all_time", label: "All Time" },
  { value: "custom", label: "Custom range" },
];

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>("this_week");
  // Custom range (YYYY-MM-DD). Only used when dateRange === "custom".
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  // Only pass custom dates once both are set, so a half-filled range doesn't query.
  const cs = dateRange === "custom" && customStart && customEnd ? customStart : undefined;
  const ce = dateRange === "custom" && customStart && customEnd ? customEnd : undefined;

  const { data: summary, isLoading: loadingSummary } = useAnalyticsSummary(dateRange, cs, ce);
  const { data: dailyStats, isLoading: loadingDaily } = useDailyStats(14);
  const { data: outcomes, isLoading: loadingOutcomes } = useOutcomeBreakdown(dateRange, cs, ce);
  const { data: dispositions } = useDispositionBreakdown(dateRange, cs, ce);
  const { data: timezones } = useTimezonePerformance();
  const { data: streak } = useCallingStreak();
  const { data: weekComparison } = useWeekComparison();
  const { data: sessions } = useSessions({ limit: 30 });
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
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
                  <SelectTrigger className="w-[160px]">
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
                {dateRange === "custom" && (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      value={customStart}
                      max={customEnd || undefined}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                    />
                    <span className="text-muted-foreground text-sm">to</span>
                    <input
                      type="date"
                      value={customEnd}
                      min={customStart || undefined}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                    />
                  </div>
                )}
              </div>
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
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-8">
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
              title="No-Shows"
              value={summary?.noShows || 0}
              icon={<CalendarX className="h-4 w-4" />}
              loading={loadingSummary}
            />
            <MetricCard
              title="No-Show Rate"
              value={summary?.noShowRate || 0}
              suffix="%"
              icon={<CalendarX className="h-4 w-4" />}
              loading={loadingSummary}
            />
            <MetricCard
              title="Session Time"
              value={Math.round((summary?.totalSessionTime || 0) / 60)}
              suffix=" min"
              icon={<Clock className="h-4 w-4" />}
              loading={loadingSummary}
            />
          </div>

          {/* Best Time to Call — cold-calling timing analytics */}
          <BestTimeToCall range={dateRange} customStart={cs} customEnd={ce} />

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
                {timezones && timezones.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      layout="vertical"
                      data={timezones
                        .slice(0, 6)
                        .map((tz) => ({
                          name: tz.timezone,
                          "Answer %": tz.answer_rate || 0,
                          calls: tz.total_calls,
                        }))}
                      margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
                      <RTooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                        formatter={(v: any, _n: any, p: any) => [`${v}% (${p.payload.calls} calls)`, "Answer rate"]}
                      />
                      <Bar dataKey="Answer %" fill="hsl(var(--primary))" radius={[0, 3, 3, 0]} maxBarSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No timezone data yet
                  </p>
                )}
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
                    Your start-to-stop calling sessions. Click one to drill in.
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
                <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-1">
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
  if (data.length === 0 || data.every((d) => d.calls === 0)) {
    return (
      <div className="h-[220px] flex items-center justify-center text-muted-foreground">
        No calls in this period
      </div>
    );
  }

  const chartData = data.map((d) => ({
    label: format(new Date(d.date), "M/d"),
    Calls: d.calls,
    Connected: d.connected,
    "Answer %": d.answerRate,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
        <YAxis yAxisId="left" tick={{ fontSize: 11 }} allowDecimals={false} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
        <RTooltip
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
          labelStyle={{ fontWeight: 600 }}
        />
        <Bar yAxisId="left" dataKey="Calls" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} maxBarSize={28} />
        <Bar yAxisId="left" dataKey="Connected" fill="#22c55e" radius={[3, 3, 0, 0]} maxBarSize={28} />
        <Line yAxisId="right" type="monotone" dataKey="Answer %" stroke="#f59e0b" strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function OutcomeChart({ outcomes }: { outcomes: { outcome: string; count: number; percentage: number; color: string }[] }) {
  if (outcomes.length === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center text-muted-foreground">
        No calls recorded
      </div>
    );
  }

  const data = outcomes.map((o) => ({
    name: o.outcome.replace(/_/g, " "),
    value: o.count,
    color: o.color,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <RPieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} />
          ))}
        </Pie>
        <RTooltip contentStyle={{ fontSize: 12, borderRadius: 8, textTransform: "capitalize" }} />
        <Legend wrapperStyle={{ fontSize: 12, textTransform: "capitalize" }} />
      </RPieChart>
    </ResponsiveContainer>
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
    <Link
      href={`/analytics/sessions/${session.id}`}
      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
    >
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
    </Link>
  );
}
