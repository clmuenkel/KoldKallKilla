"use client";

import { Header } from "@/components/layout/header";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ReferenceDot,
} from "recharts";
import { format } from "date-fns";
import { useClientMetrics, useCurrentMilestone, useMonthlyMilestones, useBusinessSettings } from "@/hooks/use-clients";
import { useAnalyticsSummary } from "@/hooks/use-analytics";
import { useIsPrimaryUser } from "@/hooks/use-primary-user";
import { CircleDollarSign, Users, Target, TrendingDown, TrendingUp, Phone } from "lucide-react";

const $ = (n: number) => `$${Math.round(n).toLocaleString()}`;

function Progress({ current, target }: { current: number; target: number }) {
  const pct = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
  return (
    <div className="h-2 bg-muted rounded-full overflow-hidden">
      <div
        className={pct >= 100 ? "h-full bg-emerald-500" : "h-full bg-primary"}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function KPI({ title, value, target, suffix = "", icon, sub }: {
  title: string; value: number; target?: number; suffix?: string; icon: React.ReactNode; sub?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{title}</span>
          <span className="text-muted-foreground">{icon}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">{suffix === "$" ? $(value) : `${value}${suffix}`}</span>
          {target != null && (
            <span className="text-xs text-muted-foreground">
              / {suffix === "$" ? $(target) : `${target}${suffix}`}
            </span>
          )}
        </div>
        {target != null && <Progress current={value} target={target} />}
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function FunnelRow({ label, value, target, rate }: { label: string; value: number; target: number; rate?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">
          <strong className="text-foreground">{value}</strong> / {target}
          {rate && <span className="ml-2 text-xs">({rate})</span>}
        </span>
      </div>
      <Progress current={value} target={target} />
    </div>
  );
}

export default function GoalsPage() {
  const isPrimary = useIsPrimaryUser();
  const { data: clients } = useClientMetrics();
  const { data: milestone } = useCurrentMilestone();
  const { data: ramp } = useMonthlyMilestones();
  const { data: settings } = useBusinessSettings();
  const { data: month } = useAnalyticsSummary("this_month");

  const closeGoal = settings?.monthly_close_goal ?? 5;
  const closesThisMonth = clients?.wonThisMonth ?? 0;
  const meetingsHeld = month?.meetingsHeld ?? 0;
  const closeRate = meetingsHeld > 0 ? Math.round((closesThisMonth / meetingsHeld) * 100) : 0;

  const rampData = (ramp ?? []).map((m) => ({
    label: format(new Date(m.month), "MMM ''yy"),
    clients: m.target_active_clients ?? 0,
    arr: m.target_arr ?? 0,
  }));
  // "You are here": index of current month in the ramp
  const nowKey = format(new Date(), "yyyy-MM");
  const hereIdx = (ramp ?? []).findIndex((m) => m.month.startsWith(nowKey));

  return (
    <div className="flex flex-col h-full">
      <Header title="Goals" showSearch={false} />
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          <PageHeader title="Goals & Business Health" description="Your $1M ramp: actual vs target." />

          {!isPrimary ? (
            <p className="text-muted-foreground">Goals tracking is set up for the primary account.</p>
          ) : (
            <>
              {/* Top KPIs — business */}
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <KPI title="Active clients" value={clients?.activeClients ?? 0}
                  target={milestone?.target_active_clients ?? undefined} icon={<Users className="h-4 w-4" />} />
                <KPI title="ARR" value={clients?.arr ?? 0} suffix="$"
                  target={milestone?.target_arr ?? undefined} icon={<CircleDollarSign className="h-4 w-4" />} />
                <KPI title="Closes this month" value={closesThisMonth} target={closeGoal}
                  icon={<Target className="h-4 w-4" />} />
                <KPI title="Churn this month" value={clients?.churnRatePct ?? 0} suffix="%"
                  icon={<TrendingDown className="h-4 w-4" />}
                  sub={`${clients?.churnedThisMonth ?? 0} churned · net ${clients?.netAddsThisMonth ?? 0}`} />
              </div>

              {/* Funnel + ramp */}
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Phone className="h-4 w-4" /> This month&apos;s funnel
                    </CardTitle>
                    <CardDescription>Activity vs monthly target (5 closes plan)</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FunnelRow label="Dials" value={month?.totalCalls ?? 0} target={1595} />
                    <FunnelRow label="Connects" value={month?.connectedCalls ?? 0} target={160}
                      rate={`${month?.answerRate ?? 0}% answer`} />
                    <FunnelRow label="Meetings set" value={month?.meetingsBooked ?? 0} target={30}
                      rate={`${month?.setRate ?? 0}% set`} />
                    <FunnelRow label="Meetings held" value={meetingsHeld} target={23} />
                    <FunnelRow label="Closes" value={closesThisMonth} target={closeGoal}
                      rate={`${closeRate}% close`} />
                    <p className="text-xs text-muted-foreground pt-1">
                      Close rate = closes ÷ meetings held. Watch it as volume climbs — it&apos;s the canary.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" /> The 30-month ramp
                    </CardTitle>
                    <CardDescription>
                      Target active clients · {rampData[0]?.clients ?? 0} → {rampData[rampData.length - 1]?.clients ?? 0}
                      {" "}({$(rampData[rampData.length - 1]?.arr ?? 0)} ARR)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart data={rampData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={3} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <RTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }}
                          formatter={(v: any, n: any) => n === "clients" ? [`${v} clients`, "Target"] : [v, n]} />
                        <Line type="monotone" dataKey="clients" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                        {hereIdx >= 0 && (
                          <ReferenceDot x={rampData[hereIdx]?.label} y={clients?.activeClients ?? 0}
                            r={5} fill="#22c55e" stroke="white" />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-muted-foreground text-center mt-1">
                      Line = target. Green dot = your actual active clients this month.
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* ARR checkpoints */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">ARR checkpoints</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-6">
                  {[["End of 2026", "2026-12"], ["End of 2027", "2027-12"], ["End of 2028", "2028-12"]].map(([lbl, key]) => {
                    const m = (ramp ?? []).find((x) => x.month.startsWith(key));
                    return (
                      <div key={key}>
                        <p className="text-xs text-muted-foreground">{lbl}</p>
                        <p className="text-lg font-bold">{$(m?.target_arr ?? 0)}</p>
                      </div>
                    );
                  })}
                  <div className="ml-auto self-center">
                    <Badge variant="secondary">Goal: ~$1M by Dec 2028</Badge>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
