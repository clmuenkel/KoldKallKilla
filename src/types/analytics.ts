// Analytics Types for Cold Calling CRM

// User Targets - editable daily/weekly goals
export interface UserTarget {
  id: string;
  user_id: string;
  target_type: "daily" | "weekly";
  calls_target: number;
  connected_target: number;
  meetings_target: number;
  voicemails_target: number;
  created_at: string;
  updated_at: string;
}

export interface UserTargetInsert {
  id?: string;
  user_id: string;
  target_type: "daily" | "weekly";
  calls_target?: number;
  connected_target?: number;
  meetings_target?: number;
  voicemails_target?: number;
}

export interface UserTargetUpdate {
  calls_target?: number;
  connected_target?: number;
  meetings_target?: number;
  voicemails_target?: number;
}

// Dialer Sessions - explicit calling sessions with event tracking
export interface DialerSession {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  total_calls: number;
  connected_calls: number;
  meetings_booked: number;
  voicemails: number;
  skipped: number;
  no_answers: number;
  gatekeepers: number;
  wrong_numbers: number;
  ai_screener: number;
  total_talk_time_seconds: number;
  avg_call_duration_seconds: number | null;
  // Session event tracking
  first_pickup_at: string | null;
  first_meeting_set_at: string | null;
  paused_at: string[];
  resumed_at: string[];
  total_pause_duration_seconds: number;
  created_at: string;
}

export interface DialerSessionInsert {
  id?: string;
  user_id: string;
  started_at: string;
  ended_at?: string | null;
  total_calls?: number;
  connected_calls?: number;
  meetings_booked?: number;
  voicemails?: number;
  skipped?: number;
  no_answers?: number;
  gatekeepers?: number;
  wrong_numbers?: number;
  ai_screener?: number;
  total_talk_time_seconds?: number;
  // Session event tracking
  first_pickup_at?: string | null;
  first_meeting_set_at?: string | null;
  paused_at?: string[];
  resumed_at?: string[];
  total_pause_duration_seconds?: number;
}

export interface DialerSessionUpdate {
  ended_at?: string | null;
  total_calls?: number;
  connected_calls?: number;
  meetings_booked?: number;
  voicemails?: number;
  skipped?: number;
  no_answers?: number;
  gatekeepers?: number;
  wrong_numbers?: number;
  ai_screener?: number;
  total_talk_time_seconds?: number;
  // Session event tracking
  first_pickup_at?: string | null;
  first_meeting_set_at?: string | null;
  paused_at?: string[];
  resumed_at?: string[];
  total_pause_duration_seconds?: number;
}

// Daily Call Stats - aggregated by day
export interface DailyCallStats {
  user_id: string;
  call_date: string;
  total_calls: number;
  connected: number;
  voicemails: number;
  no_answers: number;
  skipped: number;
  gatekeepers: number;
  wrong_numbers: number;
  ai_screener: number;
  total_talk_time: number;
  avg_call_duration: number;
  first_call_at: string | null;
  last_call_at: string | null;
  answer_rate: number | null;
}

// Weekly Call Stats - aggregated by week
export interface WeeklyCallStats {
  user_id: string;
  week_start: string;
  total_calls: number;
  connected: number;
  voicemails: number;
  no_answers: number;
  skipped: number;
  total_talk_time: number;
  avg_call_duration: number;
  days_called: number;
  answer_rate: number | null;
}

// Hourly Performance - for heatmap
export interface HourlyPerformance {
  user_id: string;
  day_of_week: number; // 0=Sunday, 6=Saturday
  hour_of_day: number; // 0-23
  total_calls: number;
  connected: number;
  answer_rate: number | null;
}

// Timezone Performance
export interface TimezonePerformance {
  user_id: string;
  timezone: string;
  total_calls: number;
  connected: number;
  answer_rate: number | null;
}

// Summary for dashboard/analytics page
export interface AnalyticsSummary {
  totalCalls: number;
  connectedCalls: number;
  meetingsBooked: number;
  voicemails: number;
  skipped: number;
  noAnswers: number;
  answerRate: number;
  setRate: number;
  totalTalkTime: number;
  avgCallDuration: number;
  totalSessionTime: number;
}

// Period comparison (this week vs last week, etc.)
export interface PeriodComparison {
  current: AnalyticsSummary;
  previous: AnalyticsSummary;
  changes: {
    totalCalls: number;
    connectedCalls: number;
    meetingsBooked: number;
    answerRate: number;
    setRate: number;
  };
}

// Session with computed stats
export interface SessionWithStats extends DialerSession {
  answer_rate: number;
  set_rate: number;
  calls_per_hour: number;
}

// Streak data
export interface CallingStreak {
  currentStreak: number;
  longestStreak: number;
  lastCallingDate: string | null;
  totalDaysThisMonth: number;
}

// Disposition breakdown for connected calls
export interface DispositionBreakdown {
  disposition: string;
  count: number;
  percentage: number;
}

// Insight suggestion from analytics
export interface AnalyticsInsight {
  type: "best_day" | "best_hour" | "best_timezone" | "streak" | "improvement";
  message: string;
  metric?: string;
  value?: number;
}

// Date range for analytics queries
export type DateRange = 
  | "today" 
  | "yesterday" 
  | "this_week" 
  | "last_week" 
  | "this_month" 
  | "last_month"
  | "custom";

export interface CustomDateRange {
  startDate: string;
  endDate: string;
}

// Chart data types
export interface TrendDataPoint {
  date: string;
  calls: number;
  connected: number;
  meetings: number;
  answerRate: number;
}

export interface OutcomeBreakdown {
  outcome: string;
  count: number;
  percentage: number;
  color: string;
}
