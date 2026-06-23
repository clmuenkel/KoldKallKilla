"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Phone, CalendarCheck } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Cell as RCell,
} from "recharts";
import {
  useCallTiming,
  fmtHourRange,
  type CallTimingData,
  type TzGroupKey,
  type BestWindow,
} from "@/hooks/use-analytics";
import type { DateRange } from "@/types/analytics";
import { cn } from "@/lib/utils";

type Metric = "pickup" | "meetings";

const MIN_CELL_CALLS = 10; // below this a cell is shown but de-emphasized (thin sample)

function hourLabel(h: number): string {
  const hr = ((h % 24) + 24) % 24;
  const ampm = hr < 12 ? "a" : "p";
  const d = hr % 12 === 0 ? 12 : hr % 12;
  return `${d}${ampm}`;
}

/** Background style for a heatmap cell based on the active metric + relative intensity. */
function cellStyle(
  cell: { calls: number; connectRate: number; meetings: number } | undefined,
  metric: Metric,
  maxRate: number,
  maxMeetings: number
): React.CSSProperties {
  if (!cell || cell.calls === 0) return { background: "transparent" };
  const thin = cell.calls < MIN_CELL_CALLS;
  if (metric === "pickup") {
    const intensity = maxRate > 0 ? cell.connectRate / maxRate : 0;
    const alpha = 0.1 + 0.85 * intensity;
    return {
      backgroundColor: `rgba(16, 185, 129, ${thin ? alpha * 0.4 : alpha})`,
      opacity: thin ? 0.7 : 1,
    };
  }
  const intensity = maxMeetings > 0 ? cell.meetings / maxMeetings : 0;
  const alpha = cell.meetings > 0 ? 0.18 + 0.82 * intensity : 0;
  return {
    backgroundColor: `rgba(168, 85, 247, ${thin ? alpha * 0.5 : alpha})`,
    opacity: thin ? 0.75 : 1,
  };
}

function WindowCard({ w }: { w: BestWindow }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{w.label}</p>
        <span className="text-[10px] font-medium text-muted-foreground rounded bg-muted px-1.5 py-0.5">
          {w.abbr}
        </span>
      </div>
      <p className="mt-1.5 text-lg font-bold text-emerald-500 leading-none">
        {fmtHourRange(w.startHour, w.endHour)}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">
        {fmtHourRange(w.ctStartHour, w.ctEndHour)} your time (CT)
      </p>
      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="text-emerald-500 font-medium">{w.connectRate}% pickup</span>
        <span>{w.calls.toLocaleString()} calls</span>
        {w.meetings > 0 && <span className="text-purple-500">{w.meetings} mtg</span>}
      </div>
    </div>
  );
}

function Heatmap({ data, metric }: { data: CallTimingData; metric: Metric }) {
  // Relative-scale maxima across all displayed cells
  let maxRate = 0;
  let maxMeetings = 0;
  for (const g of data.zones) {
    for (const h of data.hours) {
      const c = data.grid[g]?.[h];
      if (!c || c.calls < MIN_CELL_CALLS) continue;
      maxRate = Math.max(maxRate, c.connectRate);
      maxMeetings = Math.max(maxMeetings, c.meetings);
    }
  }
  const cols = data.hours;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        {/* hour header (prospect local time) */}
        <div
          className="grid items-end gap-1 mb-1"
          style={{ gridTemplateColumns: `64px repeat(${cols.length}, minmax(0, 1fr))` }}
        >
          <div className="text-[10px] text-muted-foreground">local →</div>
          {cols.map((h) => (
            <div key={h} className="text-center text-[10px] text-muted-foreground">
              {hourLabel(h)}
            </div>
          ))}
        </div>
        {data.zones.map((g) => (
          <div
            key={g}
            className="grid items-center gap-1 mb-1"
            style={{ gridTemplateColumns: `64px repeat(${cols.length}, minmax(0, 1fr))` }}
          >
            <div className="text-xs font-medium pr-1 truncate">{labelFor(g)}</div>
            {cols.map((h) => {
              const c = data.grid[g]?.[h];
              const ct = data.centralOffsetForHourLabel(g, h);
              const title = c && c.calls > 0
                ? `${labelFor(g)} · ${hourLabel(h)} local (${hourLabel(ct)} CT)\n${c.calls} calls · ${c.connectRate}% pickup · ${c.meetings} meeting${c.meetings === 1 ? "" : "s"}`
                : `${labelFor(g)} · ${hourLabel(h)} local — no calls`;
              return (
                <div
                  key={h}
                  title={title}
                  className={cn(
                    "h-9 rounded-[3px] flex items-center justify-center text-[10px] font-medium border border-border/40",
                    c && c.calls > 0 ? "text-foreground/80" : "text-transparent"
                  )}
                  style={cellStyle(c, metric, maxRate, maxMeetings)}
                >
                  {c && c.calls > 0
                    ? metric === "pickup"
                      ? `${c.connectRate}`
                      : c.meetings || ""
                    : ""}
                </div>
              );
            })}
          </div>
        ))}
        <p className="text-[10px] text-muted-foreground mt-2">
          Columns are the prospect&apos;s local hour. Cell ={" "}
          {metric === "pickup" ? "pickup %" : "meetings booked"}. Faded cells have few calls
          (&lt;{MIN_CELL_CALLS}). Hover for details + your CT time.
        </p>
      </div>
    </div>
  );
}

const ZONE_LABELS: Record<TzGroupKey, string> = {
  pacific: "Pacific",
  mountain: "Mountain",
  central: "Central",
  eastern: "Eastern",
};
function labelFor(g: TzGroupKey): string {
  return ZONE_LABELS[g];
}

function DayTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-semibold mb-1">{r.full}</p>
      <p className="text-emerald-500 font-medium">{r.pickup}% pickup rate</p>
      <p className="text-purple-500 font-medium">
        {r.meetings} meeting{r.meetings === 1 ? "" : "s"} booked
      </p>
      <p className="text-muted-foreground">{r.calls.toLocaleString()} calls</p>
    </div>
  );
}

function DayChart({ data }: { data: CallTimingData }) {
  const rows = data.byDay.map((d) => ({
    name: d.label.slice(0, 3),
    full: d.label,
    pickup: d.connectRate,
    calls: d.calls,
    meetings: d.meetings,
  }));
  const best = data.bestDay;
  return (
    <div>
      {best && (
        <p className="text-sm mb-2">
          Best day: <span className="font-semibold text-emerald-500">{best.label}</span>{" "}
          <span className="text-muted-foreground">
            ({best.connectRate}% pickup · {best.meetings} meeting{best.meetings === 1 ? "" : "s"})
          </span>
        </p>
      )}
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={rows} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 11 }} unit="%" />
          <RTooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} content={<DayTooltip />} />
          <Bar dataKey="pickup" radius={[4, 4, 0, 0]}>
            {rows.map((r, i) => (
              <RCell
                key={i}
                fill={best && r.name === best.label.slice(0, 3) ? "#10b981" : "#34d399"}
                fillOpacity={r.calls > 0 ? 1 : 0.2}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BestTimeToCall({
  range,
  customStart,
  customEnd,
}: {
  range: DateRange;
  customStart?: string;
  customEnd?: string;
}) {
  const { data, isLoading } = useCallTiming(range, customStart, customEnd);
  const [metric, setMetric] = useState<Metric>("pickup");

  return (
    <Card className="border-emerald-200/60 dark:border-emerald-900/40">
      <CardHeader>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-emerald-500" />
              Best Time to Call
            </CardTitle>
            <CardDescription>
              When prospects pick up & book — by their timezone and your calling day.
            </CardDescription>
          </div>
          <div className="flex rounded-md border p-0.5 text-xs">
            <button
              onClick={() => setMetric("pickup")}
              className={cn(
                "px-2.5 py-1 rounded-[5px] font-medium transition-colors flex items-center gap-1",
                metric === "pickup" ? "bg-emerald-500 text-white" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Phone className="h-3 w-3" /> Pickup
            </button>
            <button
              onClick={() => setMetric("meetings")}
              className={cn(
                "px-2.5 py-1 rounded-[5px] font-medium transition-colors flex items-center gap-1",
                metric === "meetings" ? "bg-purple-500 text-white" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <CalendarCheck className="h-3 w-3" /> Meetings
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : !data || data.totalCalls === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No calls in this range yet. Make some dials and your best windows will show up here.
          </p>
        ) : (
          <>
            {/* Best window callouts */}
            {data.bestWindows.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                  Recommended windows
                </p>
                <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                  {data.bestWindows.map((w) => (
                    <WindowCard key={w.group} w={w} />
                  ))}
                </div>
              </div>
            )}

            {/* Heatmap */}
            <Heatmap data={data} metric={metric} />

            {/* Day of week */}
            <div className="pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                By day of week
              </p>
              <DayChart data={data} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
