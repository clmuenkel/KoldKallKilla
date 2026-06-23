"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuthId } from "@/hooks/use-auth";
import { getContactTimezone, getTimezoneGroup, getTimezoneGroupLabel } from "@/lib/timezone";
import { 
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  subDays,
  subWeeks,
  format,
  differenceInDays,
} from "date-fns";
import type {
  DailyCallStats,
  WeeklyCallStats,
  HourlyPerformance,
  TimezonePerformance,
  AnalyticsSummary,
  TrendDataPoint,
  OutcomeBreakdown,
  CallingStreak,
  DispositionBreakdown,
  DateRange,
} from "@/types/analytics";

// A "meeting set from a dial" = a logged call whose disposition is a booked
// meeting. This is what the dial analytics should count — NOT every row in the
// meetings table, which also includes follow-ups/standalone meetings Zad books
// himself (or anything synced from Outlook).
const MEETING_DISPOSITIONS = ["meeting", "interested_meeting"];

function isMeetingDisposition(disposition: string | null | undefined): boolean {
  return !!disposition && MEETING_DISPOSITIONS.includes(disposition);
}

// Fetch ALL calls in a date range, paginating past PostgREST's 1000-row cap so
// wide ranges (e.g. "All Time") count every row instead of silently capping.
async function fetchAllCallsInRange(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  select: string,
  startISO: string,
  endISO: string
): Promise<any[]> {
  const PAGE = 1000;
  let from = 0;
  const rows: any[] = [];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabase
      .from("calls")
      .select(select)
      .eq("user_id", userId)
      .gte("started_at", startISO)
      .lte("started_at", endISO)
      .order("started_at", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) {
      if (error.code === "42P01") break; // table doesn't exist yet
      throw error;
    }
    const batch = (data as any[]) || [];
    rows.push(...batch);
    if (batch.length < PAGE) break;
    from += PAGE;
  }
  return rows;
}

// Get date range bounds
function getDateBounds(range: DateRange, customStart?: string, customEnd?: string) {
  const now = new Date();
  
  switch (range) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "yesterday":
      const yesterday = subDays(now, 1);
      return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
    case "this_week":
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfDay(now) };
    case "last_week":
      const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      return { start: lastWeekStart, end: lastWeekEnd };
    case "this_month":
      return { start: startOfMonth(now), end: endOfDay(now) };
    case "last_month":
      const lastMonth = subDays(startOfMonth(now), 1);
      return { start: startOfMonth(lastMonth), end: endOfDay(lastMonth) };
    case "all_time":
      // Everything ever logged, up to end of today.
      return { start: new Date("2000-01-01T00:00:00Z"), end: endOfDay(now) };
    case "custom":
      return {
        // Normalize to full-day bounds like every other range, so a custom end
        // date includes that whole day instead of cutting off at midnight.
        start: customStart ? startOfDay(new Date(customStart)) : startOfDay(now),
        end: customEnd ? endOfDay(new Date(customEnd)) : endOfDay(now),
      };
    default:
      return { start: startOfDay(now), end: endOfDay(now) };
  }
}

// Main analytics summary hook
export function useAnalyticsSummary(
  range: DateRange = "today",
  customStart?: string,
  customEnd?: string
) {
  const supabase = createClient();
  const userId = useAuthId();
  const { start, end } = getDateBounds(range, customStart, customEnd);

  return useQuery({
    queryKey: ["analytics-summary", userId, range, customStart, customEnd],
    enabled: !!userId,
    queryFn: async (): Promise<AnalyticsSummary> => {
      // Get call stats (paginated so wide ranges like "All Time" aren't capped)
      const calls = await fetchAllCallsInRange(
        supabase,
        userId!,
        "outcome, duration_seconds, disposition",
        start.toISOString(),
        end.toISOString()
      );

      const { data: sessions } = await (supabase as any)
        .from("dialer_sessions")
        .select("duration_seconds")
        .eq("user_id", userId!)
        .gte("started_at", start.toISOString())
        .lte("started_at", end.toISOString())
        .not("duration_seconds", "is", null);

      const totalSessionTime = ((sessions as any[]) || [])
        .reduce((sum: number, s: { duration_seconds: number | null }) => sum + (s.duration_seconds || 0), 0);

      // Meetings that came due in this range, by scheduled_at. No-show rate is
      // measured against RESOLVED meetings (no_show + completed) — "of the
      // meetings that actually came due, what % flaked."
      const { data: mtgs } = await supabase
        .from("meetings")
        .select("status")
        .eq("user_id", userId!)
        .in("status", ["no_show", "completed"])
        .gte("scheduled_at", start.toISOString())
        .lte("scheduled_at", end.toISOString());
      const mtgList = (mtgs as { status: string }[]) || [];
      const noShows = mtgList.filter((m) => m.status === "no_show").length;
      const completedMeetings = mtgList.filter((m) => m.status === "completed").length;
      const resolvedMeetings = noShows + completedMeetings;

      const callsList = calls || [];
      // Meetings booked FROM dials only: a CONNECTED call dispositioned as a
      // booked meeting (connected guard prevents a stale disposition on a
      // no-answer call from being counted).
      const meetingsBooked = callsList.filter(
        (c) => c.outcome === "connected" && isMeetingDisposition(c.disposition)
      ).length;

      const totalCalls = callsList.length;
      const connectedCalls = callsList.filter((c) => c.outcome === "connected").length;
      const voicemails = callsList.filter((c) => c.outcome === "voicemail").length;
      const skipped = callsList.filter((c) => c.outcome === "skipped").length;
      const noAnswers = callsList.filter((c) => c.outcome === "no_answer").length;
      const actualAttempts = totalCalls - skipped;

      const totalTalkTime = callsList
        .filter((c) => c.outcome === "connected")
        .reduce((sum, c) => sum + (c.duration_seconds || 0), 0);

      return {
        totalCalls,
        connectedCalls,
        meetingsBooked,
        voicemails,
        skipped,
        noAnswers,
        answerRate: actualAttempts > 0 ? Math.round((connectedCalls / actualAttempts) * 100) : 0,
        setRate: connectedCalls > 0 ? Math.round((meetingsBooked / connectedCalls) * 100) : 0,
        noShows,
        noShowRate: resolvedMeetings > 0 ? Math.round((noShows / resolvedMeetings) * 100) : 0,
        meetingsHeld: completedMeetings,
        totalTalkTime,
        avgCallDuration: connectedCalls > 0 ? Math.round(totalTalkTime / connectedCalls) : 0,
        totalSessionTime,
      };
    },
  });
}

// Daily stats for trend charts
export function useDailyStats(days: number = 14) {
  const supabase = createClient();
  const userId = useAuthId();
  const end = new Date();
  const start = subDays(end, days);

  return useQuery({
    queryKey: ["daily-stats", userId, days],
    enabled: !!userId,
    queryFn: async (): Promise<TrendDataPoint[]> => {
      const { data: calls, error } = await supabase
        .from("calls")
        .select("started_at, outcome, disposition")
        .eq("user_id", userId!)
        .gte("started_at", start.toISOString())
        .lte("started_at", end.toISOString())
        .order("started_at", { ascending: true });

      if (error && error.code !== "42P01") throw error;

      // Group by date
      const callsByDate: Record<string, { total: number; connected: number }> = {};
      const meetingsByDate: Record<string, number> = {};

      (calls || []).forEach((call) => {
        const date = format(new Date(call.started_at), "yyyy-MM-dd");
        if (!callsByDate[date]) callsByDate[date] = { total: 0, connected: 0 };
        if (call.outcome !== "skipped") {
          callsByDate[date].total++;
          if (call.outcome === "connected") callsByDate[date].connected++;
        }
        // Meetings set from dials only: connected + booked-meeting disposition.
        if (call.outcome === "connected" && isMeetingDisposition(call.disposition)) {
          meetingsByDate[date] = (meetingsByDate[date] || 0) + 1;
        }
      });

      // Build trend data for each day
      const result: TrendDataPoint[] = [];
      for (let i = 0; i <= days; i++) {
        const date = format(subDays(end, days - i), "yyyy-MM-dd");
        const dayStats = callsByDate[date] || { total: 0, connected: 0 };
        result.push({
          date,
          calls: dayStats.total,
          connected: dayStats.connected,
          meetings: meetingsByDate[date] || 0,
          answerRate: dayStats.total > 0 
            ? Math.round((dayStats.connected / dayStats.total) * 100) 
            : 0,
        });
      }

      return result;
    },
  });
}

// Outcome breakdown for pie chart
export function useOutcomeBreakdown(range: DateRange = "this_week", customStart?: string, customEnd?: string) {
  const supabase = createClient();
  const userId = useAuthId();
  const { start, end } = getDateBounds(range, customStart, customEnd);

  return useQuery({
    queryKey: ["outcome-breakdown", userId!, range, customStart, customEnd],
    enabled: !!userId,
    queryFn: async (): Promise<OutcomeBreakdown[]> => {
      const calls = (
        await fetchAllCallsInRange(
          supabase,
          userId!,
          "outcome",
          start.toISOString(),
          end.toISOString()
        )
      ).filter((c) => c.outcome !== "skipped");

      const counts: Record<string, number> = {};
      calls.forEach((call) => {
        counts[call.outcome] = (counts[call.outcome] || 0) + 1;
      });

      const total = Object.values(counts).reduce((sum, c) => sum + c, 0);
      const colors: Record<string, string> = {
        connected: "#22c55e",
        voicemail: "#f59e0b",
        no_answer: "#ef4444",
        ai_screener: "#6366f1",
        gatekeeper: "#8b5cf6",
        wrong_number: "#ec4899",
      };

      return Object.entries(counts).map(([outcome, count]) => ({
        outcome,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
        color: colors[outcome] || "#94a3b8",
      }));
    },
  });
}

// Hourly performance for heatmap
export function useHourlyPerformance() {
  const supabase = createClient();
  const userId = useAuthId();

  return useQuery({
    queryKey: ["hourly-performance", userId],
    enabled: !!userId,
    queryFn: async (): Promise<HourlyPerformance[]> => {
      // Query calls from the last 30 days
      const thirtyDaysAgo = subDays(new Date(), 30);
      
      const { data: calls, error } = await supabase
        .from("calls")
        .select("started_at, outcome")
        .eq("user_id", userId!)
        .gte("started_at", thirtyDaysAgo.toISOString())
        .neq("outcome", "skipped");

      if (error && error.code !== "42P01") throw error;

      // Group by day of week and hour
      const grid: Record<string, { total: number; connected: number }> = {};
      
      (calls || []).forEach((call) => {
        const date = new Date(call.started_at);
        const dayOfWeek = date.getDay(); // 0-6
        const hour = date.getHours(); // 0-23
        const key = `${dayOfWeek}-${hour}`;
        
        if (!grid[key]) grid[key] = { total: 0, connected: 0 };
        grid[key].total++;
        if (call.outcome === "connected") grid[key].connected++;
      });

      // Convert to array
      const result: HourlyPerformance[] = [];
      for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
          const key = `${day}-${hour}`;
          const stats = grid[key] || { total: 0, connected: 0 };
          result.push({
            user_id: userId!,
            day_of_week: day,
            hour_of_day: hour,
            total_calls: stats.total,
            connected: stats.connected,
            answer_rate: stats.total > 0 
              ? Math.round((stats.connected / stats.total) * 100) 
              : null,
          });
        }
      }

      return result;
    },
  });
}

// Timezone performance
export function useTimezonePerformance() {
  const supabase = createClient();
  const userId = useAuthId();

  return useQuery({
    queryKey: ["timezone-performance", userId],
    enabled: !!userId,
    queryFn: async (): Promise<TimezonePerformance[]> => {
      const thirtyDaysAgo = subDays(new Date(), 30);

      // contacts.timezone does NOT exist — timezone is derived from the contact's
      // state, falling back to the company's timezone (same logic as the dialer).
      const { data: calls, error } = await supabase
        .from("calls")
        .select(`
          outcome,
          contacts(state, companies(timezone))
        `)
        .eq("user_id", userId!)
        .gte("started_at", thirtyDaysAgo.toISOString())
        .neq("outcome", "skipped");

      if (error && error.code !== "42P01") throw error;

      // Group by TZ group label (Eastern / Central / Mountain / Pacific / …)
      const byTimezone: Record<string, { total: number; connected: number }> = {};

      (calls || []).forEach((call: any) => {
        const contact = call.contacts;
        const tz = getContactTimezone(
          { state: contact?.state ?? null },
          contact?.companies ? { timezone: contact.companies.timezone } : null
        );
        const label = getTimezoneGroupLabel(getTimezoneGroup(tz));
        if (!byTimezone[label]) byTimezone[label] = { total: 0, connected: 0 };
        byTimezone[label].total++;
        if (call.outcome === "connected") byTimezone[label].connected++;
      });

      return Object.entries(byTimezone)
        .map(([timezone, stats]) => ({
          user_id: userId!,
          timezone,
          total_calls: stats.total,
          connected: stats.connected,
          answer_rate: stats.total > 0
            ? Math.round((stats.connected / stats.total) * 100)
            : null,
        }))
        .sort((a, b) => b.total_calls - a.total_calls);
    },
  });
}

// Disposition breakdown for connected calls
export function useDispositionBreakdown(range: DateRange = "this_week", customStart?: string, customEnd?: string) {
  const supabase = createClient();
  const userId = useAuthId();
  const { start, end } = getDateBounds(range, customStart, customEnd);

  return useQuery({
    queryKey: ["disposition-breakdown", userId, range, customStart, customEnd],
    enabled: !!userId,
    queryFn: async (): Promise<DispositionBreakdown[]> => {
      const { data: calls, error } = await supabase
        .from("calls")
        .select("disposition")
        .eq("user_id", userId!)
        .eq("outcome", "connected")
        .gte("started_at", start.toISOString())
        .lte("started_at", end.toISOString())
        .not("disposition", "is", null);

      if (error && error.code !== "42P01") throw error;

      const counts: Record<string, number> = {};
      (calls || []).forEach((call) => {
        if (call.disposition) {
          counts[call.disposition] = (counts[call.disposition] || 0) + 1;
        }
      });

      const total = Object.values(counts).reduce((sum, c) => sum + c, 0);

      return Object.entries(counts).map(([disposition, count]) => ({
        disposition,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      }));
    },
  });
}

// Calling streak
export function useCallingStreak() {
  const supabase = createClient();
  const userId = useAuthId();

  return useQuery({
    queryKey: ["calling-streak", userId],
    enabled: !!userId,
    queryFn: async (): Promise<CallingStreak> => {
      // Get all unique calling dates in the last 90 days
      const ninetyDaysAgo = subDays(new Date(), 90);
      
      const { data: calls, error } = await supabase
        .from("calls")
        .select("started_at")
        .eq("user_id", userId!)
        .gte("started_at", ninetyDaysAgo.toISOString())
        .neq("outcome", "skipped")
        .order("started_at", { ascending: false });

      if (error && error.code !== "42P01") throw error;

      // Get unique dates
      const dates = new Set<string>();
      (calls || []).forEach((call) => {
        dates.add(format(new Date(call.started_at), "yyyy-MM-dd"));
      });

      const sortedDates = Array.from(dates).sort().reverse();
      
      // Calculate current streak
      let currentStreak = 0;
      let today = format(new Date(), "yyyy-MM-dd");
      let checkDate = today;
      
      for (let i = 0; i < sortedDates.length; i++) {
        if (sortedDates[i] === checkDate || sortedDates[i] === format(subDays(new Date(checkDate), 1), "yyyy-MM-dd")) {
          currentStreak++;
          checkDate = sortedDates[i];
        } else if (currentStreak === 0 && sortedDates[i] === format(subDays(new Date(), 1), "yyyy-MM-dd")) {
          // Started counting from yesterday
          currentStreak = 1;
          checkDate = sortedDates[i];
        } else {
          break;
        }
      }

      // Calculate longest streak
      let longestStreak = 0;
      let tempStreak = 0;
      const allDates = Array.from(dates).sort();
      
      for (let i = 0; i < allDates.length; i++) {
        if (i === 0) {
          tempStreak = 1;
        } else {
          const diff = differenceInDays(new Date(allDates[i]), new Date(allDates[i - 1]));
          if (diff === 1) {
            tempStreak++;
          } else {
            longestStreak = Math.max(longestStreak, tempStreak);
            tempStreak = 1;
          }
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);

      // Days called this month
      const thisMonth = startOfMonth(new Date());
      const daysThisMonth = Array.from(dates).filter(
        (d) => new Date(d) >= thisMonth
      ).length;

      return {
        currentStreak,
        longestStreak,
        lastCallingDate: sortedDates[0] || null,
        totalDaysThisMonth: daysThisMonth,
      };
    },
  });
}

// Week over week comparison
export function useWeekComparison() {
  const thisWeek = useAnalyticsSummary("this_week");
  const lastWeek = useAnalyticsSummary("last_week");

  const isLoading = thisWeek.isLoading || lastWeek.isLoading;
  const error = thisWeek.error || lastWeek.error;

  const data = thisWeek.data && lastWeek.data ? {
    current: thisWeek.data,
    previous: lastWeek.data,
    changes: {
      totalCalls: thisWeek.data.totalCalls - lastWeek.data.totalCalls,
      connectedCalls: thisWeek.data.connectedCalls - lastWeek.data.connectedCalls,
      meetingsBooked: thisWeek.data.meetingsBooked - lastWeek.data.meetingsBooked,
      answerRate: thisWeek.data.answerRate - lastWeek.data.answerRate,
      setRate: thisWeek.data.setRate - lastWeek.data.setRate,
    },
  } : null;

  return { data, isLoading, error };
}

// ============================================================================
// Best Time to Call — cold-calling timing analytics
// ----------------------------------------------------------------------------
// Answers: when (prospect-local hour) and which day do calls get answered /
// book meetings, broken down by US timezone. Built from the calls table (the
// robust dataset) joined to each contact's state → IANA timezone. Hours are
// bucketed in the PROSPECT's local time; recommended windows are also shown in
// Zad's Central dialing time. "pickup" = outcome 'connected'; "meeting" =
// connected + a meeting disposition. 'skipped' calls are excluded.
// ============================================================================

// Continental US zone groups, in west→east display order. The offset converts a
// prospect-LOCAL hour into Zad's Central dialing time (centralHour = localHour +
// offset). Central is behind Eastern by 1h and ahead of Mountain/Pacific, so:
//   Eastern 2pm → 1pm CT (-1);  Mountain 11am → 12pm CT (+1);  Pacific 10am → 12pm CT (+2).
export const TZ_GROUP_ORDER = ["pacific", "mountain", "central", "eastern"] as const;
export type TzGroupKey = (typeof TZ_GROUP_ORDER)[number];
const TZ_OFFSET_FROM_CENTRAL: Record<TzGroupKey, number> = {
  pacific: 2,
  mountain: 1,
  central: 0,
  eastern: -1,
};
const TZ_GROUP_LABEL: Record<TzGroupKey, string> = {
  pacific: "Pacific",
  mountain: "Mountain",
  central: "Central",
  eastern: "Eastern",
};
const TZ_GROUP_ABBR: Record<TzGroupKey, string> = {
  pacific: "PT",
  mountain: "MT",
  central: "CT",
  eastern: "ET",
};

// Business-hour window shown in the heatmap (prospect local time, 24h).
const TIMING_HOUR_START = 7;
const TIMING_HOUR_END = 19; // inclusive last column = 18 (6pm)
// A window must have at least this many calls to be eligible as a "best window".
const MIN_WINDOW_CALLS = 15;

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface TimingCell {
  calls: number;
  connected: number;
  meetings: number;
  connectRate: number; // 0-100
}
export interface BestWindow {
  group: TzGroupKey;
  label: string;       // "Eastern"
  abbr: string;        // "ET"
  startHour: number;   // prospect-local
  endHour: number;     // prospect-local (exclusive end label)
  connectRate: number;
  calls: number;
  meetings: number;
  ctStartHour: number; // translated to Central
  ctEndHour: number;
}
export interface DayTiming {
  dow: number;
  label: string;
  calls: number;
  connected: number;
  meetings: number;
  connectRate: number;
}
export interface CallTimingData {
  zones: TzGroupKey[];                              // groups present, in display order
  hours: number[];                                 // prospect-local hour columns
  grid: Record<TzGroupKey, Record<number, TimingCell>>;
  byDay: DayTiming[];                              // Mon..Sun ordered
  bestWindows: BestWindow[];                       // one per present zone
  bestDay: DayTiming | null;
  totalCalls: number;
  centralOffsetForHourLabel: (group: TzGroupKey, hour: number) => number;
}

function fmtHour12(h: number): string {
  const hr = ((h % 24) + 24) % 24;
  const ampm = hr < 12 ? "am" : "pm";
  const display = hr % 12 === 0 ? 12 : hr % 12;
  return `${display}${ampm}`;
}
export function fmtHourRange(start: number, end: number): string {
  return `${fmtHour12(start)}–${fmtHour12(end)}`;
}
export { TZ_GROUP_LABEL, TZ_GROUP_ABBR };

/**
 * Cold-calling timing analytics: prospect-local hour × timezone heatmap,
 * day-of-week performance, and recommended call windows (with Central
 * translation). Respects the analytics date-range selector.
 */
export function useCallTiming(
  range: DateRange = "this_month",
  customStart?: string,
  customEnd?: string
) {
  const supabase = createClient();
  const userId = useAuthId();
  const { start, end } = getDateBounds(range, customStart, customEnd);

  return useQuery({
    queryKey: ["call-timing", userId, range, customStart, customEnd],
    enabled: !!userId,
    queryFn: async (): Promise<CallTimingData> => {
      // Fetch ALL calls in range with the contact's state/company tz, paginating
      // past PostgREST's 1000-row cap.
      const PAGE = 1000;
      let from = 0;
      const rows: any[] = [];
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data, error } = await supabase
          .from("calls")
          .select("started_at, outcome, disposition, contacts(state, companies(timezone))")
          .eq("user_id", userId!)
          .neq("outcome", "skipped")
          .gte("started_at", start.toISOString())
          .lte("started_at", end.toISOString())
          .order("started_at", { ascending: true })
          .range(from, from + PAGE - 1);
        if (error && error.code !== "42P01") throw error;
        const batch = (data as any[]) || [];
        rows.push(...batch);
        if (batch.length < PAGE) break;
        from += PAGE;
      }

      // Formatters: prospect-local hour (per IANA tz) and Zad-local weekday (CT).
      const ctWeekday = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Chicago",
        weekday: "short",
      });
      const hourFmtCache: Record<string, Intl.DateTimeFormat> = {};
      const hourInTz = (iso: string, tz: string): number => {
        const f =
          hourFmtCache[tz] ||
          (hourFmtCache[tz] = new Intl.DateTimeFormat("en-US", {
            timeZone: tz,
            hour: "numeric",
            hour12: false,
          }));
        const h = parseInt(f.format(new Date(iso)), 10);
        return h === 24 ? 0 : h; // some environments render midnight as 24
      };
      const dowIndex = (label: string) => DOW_LABELS.indexOf(label);

      const grid = {} as Record<TzGroupKey, Record<number, TimingCell>>;
      for (const g of TZ_GROUP_ORDER) grid[g] = {};
      const zonesPresent = new Set<TzGroupKey>();
      const dayAgg: Record<number, { calls: number; connected: number; meetings: number }> = {};

      for (const c of rows) {
        const contact = c.contacts;
        const tz = getContactTimezone(
          { state: contact?.state ?? null },
          contact?.companies ? { timezone: contact.companies.timezone } : null
        );
        const group = getTimezoneGroup(tz) as string;
        const connected = c.outcome === "connected";
        const meeting = connected && isMeetingDisposition(c.disposition);

        // Day-of-week (in Zad's Central working day)
        const dow = dowIndex(ctWeekday.format(new Date(c.started_at)));
        if (dow >= 0) {
          const d = (dayAgg[dow] ||= { calls: 0, connected: 0, meetings: 0 });
          d.calls++;
          if (connected) d.connected++;
          if (meeting) d.meetings++;
        }

        // Hour grid only for the four continental US zones with a known tz
        if (!tz || !(TZ_GROUP_ORDER as readonly string[]).includes(group)) continue;
        const g = group as TzGroupKey;
        zonesPresent.add(g);
        const hour = hourInTz(c.started_at, tz);
        const cell =
          grid[g][hour] || (grid[g][hour] = { calls: 0, connected: 0, meetings: 0, connectRate: 0 });
        cell.calls++;
        if (connected) cell.connected++;
        if (meeting) cell.meetings++;
      }

      // Finalize connect rates
      for (const g of TZ_GROUP_ORDER) {
        for (const h of Object.keys(grid[g])) {
          const cell = grid[g][Number(h)];
          cell.connectRate = cell.calls > 0 ? Math.round((cell.connected / cell.calls) * 100) : 0;
        }
      }

      const hours: number[] = [];
      for (let h = TIMING_HOUR_START; h < TIMING_HOUR_END; h++) hours.push(h);

      // Best 2-hour window per present zone (by connect rate, min sample size)
      const zones = TZ_GROUP_ORDER.filter((g) => zonesPresent.has(g));
      const bestWindows: BestWindow[] = [];
      for (const g of zones) {
        let best: BestWindow | null = null;
        for (let h = TIMING_HOUR_START; h < TIMING_HOUR_END - 1; h++) {
          const a = grid[g][h];
          const b = grid[g][h + 1];
          const calls = (a?.calls || 0) + (b?.calls || 0);
          if (calls < MIN_WINDOW_CALLS) continue;
          const connected = (a?.connected || 0) + (b?.connected || 0);
          const meetings = (a?.meetings || 0) + (b?.meetings || 0);
          const rate = Math.round((connected / calls) * 100);
          if (!best || rate > best.connectRate) {
            const off = TZ_OFFSET_FROM_CENTRAL[g];
            best = {
              group: g,
              label: TZ_GROUP_LABEL[g],
              abbr: TZ_GROUP_ABBR[g],
              startHour: h,
              endHour: h + 2,
              connectRate: rate,
              calls,
              meetings,
              ctStartHour: h + off,
              ctEndHour: h + 2 + off,
            };
          }
        }
        if (best) bestWindows.push(best);
      }

      // Day-of-week, Mon..Sun
      const dayOrder = [1, 2, 3, 4, 5, 6, 0];
      const byDay: DayTiming[] = dayOrder.map((dow) => {
        const d = dayAgg[dow] || { calls: 0, connected: 0, meetings: 0 };
        return {
          dow,
          label: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dow],
          calls: d.calls,
          connected: d.connected,
          meetings: d.meetings,
          connectRate: d.calls > 0 ? Math.round((d.connected / d.calls) * 100) : 0,
        };
      });
      const bestDay =
        byDay.filter((d) => d.calls >= MIN_WINDOW_CALLS).sort((a, b) => b.connectRate - a.connectRate)[0] ||
        null;

      return {
        zones,
        hours,
        grid,
        byDay,
        bestWindows,
        bestDay,
        totalCalls: rows.length,
        centralOffsetForHourLabel: (group, hour) => hour + TZ_OFFSET_FROM_CENTRAL[group],
      };
    },
  });
}
