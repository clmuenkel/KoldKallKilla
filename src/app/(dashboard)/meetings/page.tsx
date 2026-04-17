"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useAllMeetings } from "@/hooks/use-meetings";
import { MeetingDetailDialog } from "@/components/meetings/meeting-detail";
import { CreateMeetingDialog } from "@/components/meetings/create-meeting-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAuthId } from "@/hooks/use-auth";
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  addDays,
  addMinutes,
  isSameDay,
  isToday,
  getHours,
  getMinutes,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  isSameMonth,
  isPast,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  Clock,
  MapPin,
  User,
  Building2,
  Video,
} from "lucide-react";
import type { MeetingWithContact } from "@/types/database";

// ─── Constants ──────────────────────────────────────────────
type CalendarView = "day" | "week" | "month";

const START_HOUR = 7;
const END_HOUR = 19;
const TOTAL_HOURS = END_HOUR - START_HOUR; // 12
const TOTAL_MINUTES = TOTAL_HOURS * 60; // 720

function toTopPct(minutesFromStart: number): number {
  return Math.max(0, Math.min((minutesFromStart / TOTAL_MINUTES) * 100, 100));
}
function toHeightPct(duration: number): number {
  return Math.max(0, Math.min((duration / TOTAL_MINUTES) * 100, 100));
}
function hourLabel(h: number): string {
  if (h === 12) return "12 PM";
  if (h < 12) return `${h} AM`;
  return `${h - 12} PM`;
}

// ─── Page ───────────────────────────────────────────────────
export default function MeetingsPage() {
  const userId = useAuthId();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [view, setView] = useState<CalendarView>("week");
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: allMeetings, isLoading, isError, error } = useAllMeetings();

  if (!userId) return null;

  const goToday = () => {
    setCurrentDate(new Date());
    setSelectedDay(new Date());
  };
  const goPrev = () => {
    if (view === "week") setCurrentDate(subWeeks(currentDate, 1));
    else if (view === "day") {
      const d = addDays(currentDate, -1);
      setCurrentDate(d);
      setSelectedDay(d);
    } else setCurrentDate(subMonths(currentDate, 1));
  };
  const goNext = () => {
    if (view === "week") setCurrentDate(addWeeks(currentDate, 1));
    else if (view === "day") {
      const d = addDays(currentDate, 1);
      setCurrentDate(d);
      setSelectedDay(d);
    } else setCurrentDate(addMonths(currentDate, 1));
  };

  const dateLabel = useMemo(() => {
    if (view === "day") return format(currentDate, "EEEE, MMMM d, yyyy");
    if (view === "week") {
      const ws = startOfWeek(currentDate, { weekStartsOn: 0 });
      const we = endOfWeek(currentDate, { weekStartsOn: 0 });
      return format(ws, "MMM") === format(we, "MMM")
        ? `${format(ws, "MMM d")} \u2013 ${format(we, "d, yyyy")}`
        : `${format(ws, "MMM d")} \u2013 ${format(we, "MMM d, yyyy")}`;
    }
    return format(currentDate, "MMMM yyyy");
  }, [currentDate, view]);

  const getMeetingsForDay = useCallback(
    (date: Date) =>
      (allMeetings || [])
        .filter((m) => isSameDay(new Date(m.scheduled_at), date))
        .sort(
          (a, b) =>
            new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
        ),
    [allMeetings]
  );

  const sidebarMeetings = useMemo(
    () => getMeetingsForDay(selectedDay),
    [selectedDay, getMeetingsForDay]
  );

  const weekDays = useMemo(() => {
    const s = startOfWeek(currentDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(s, i));
  }, [currentDate]);

  const hours = useMemo(
    () => Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i),
    []
  );

  const gridDays = view === "day" ? [currentDate] : weekDays;

  return (
    <div className="flex flex-col h-full">
      {/* ─── Compact toolbar (replaces Header) ─── */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card shrink-0 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-base font-bold mr-1 hidden xl:inline shrink-0">
            Meetings
          </span>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={goToday}>
            Today
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goPrev}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goNext}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <h2 className="text-sm font-semibold ml-1 select-none truncate">
            {dateLabel}
          </h2>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex rounded-lg border bg-muted p-0.5">
            {(["day", "week", "month"] as const).map((v) => (
              <button
                key={v}
                onClick={() => {
                  setView(v);
                  if (v === "day") setSelectedDay(currentDate);
                }}
                className={cn(
                  "px-2.5 py-0.5 text-xs font-medium rounded-md transition-colors capitalize",
                  view === v
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <Button onClick={() => setCreateOpen(true)} size="sm" className="h-7 text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Schedule
          </Button>
        </div>
      </div>

      {/* ─── Main area ─── */}
      <div className="flex-1 min-h-0 flex">
        {/* ── Calendar grid ── */}
        <div className="flex-1 min-w-0 flex flex-col">
          {isLoading ? (
            <div className="p-6 flex-1">
              <Skeleton className="h-full w-full rounded-xl" />
            </div>
          ) : isError ? (
            <div className="p-6 flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-destructive font-medium">Failed to load meetings</p>
                <p className="text-sm text-muted-foreground mt-1">{error?.message || "Could not connect to the database. Please check your connection and try again."}</p>
              </div>
            </div>
          ) : view === "month" ? (
            <MonthView
              currentDate={currentDate}
              meetings={allMeetings || []}
              onMeetingClick={setSelectedMeetingId}
              onDayClick={(d) => {
                setCurrentDate(d);
                setSelectedDay(d);
                setView("day");
              }}
            />
          ) : (
            <>
              {/* Day headers */}
              <div className="flex shrink-0 border-b">
                <div className="w-11 shrink-0" />
                {gridDays.map((day) => {
                  const td = isToday(day);
                  const sel = isSameDay(day, selectedDay);
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDay(day)}
                      className={cn(
                        "flex-1 text-center py-1.5 border-l first:border-l-0 transition-colors",
                        sel ? "bg-primary/5" : "hover:bg-muted/40"
                      )}
                    >
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
                        {format(day, "EEE")}
                      </p>
                      <span
                        className={cn(
                          "inline-flex items-center justify-center text-base font-semibold leading-none mt-0.5",
                          td && "bg-primary text-primary-foreground rounded-full w-7 h-7",
                          sel && !td && "text-primary"
                        )}
                      >
                        {format(day, "d")}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Time grid — fills remaining height, NO scrolling */}
              <div className="flex-1 flex min-h-0">
                {/* Time labels */}
                <div className="w-11 shrink-0 relative select-none">
                  {hours.map((h, i) => (
                    <div
                      key={h}
                      className="absolute right-1 text-[10px] text-muted-foreground leading-none -translate-y-1/2"
                      style={{ top: `${(i / TOTAL_HOURS) * 100}%` }}
                    >
                      {hourLabel(h)}
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {gridDays.map((day) => (
                  <DayColumn
                    key={day.toISOString()}
                    day={day}
                    meetings={getMeetingsForDay(day)}
                    hours={hours}
                    isSelected={isSameDay(day, selectedDay)}
                    onMeetingClick={setSelectedMeetingId}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Sidebar: selected day schedule ── */}
        {view !== "month" && (
          <Sidebar
            day={selectedDay}
            meetings={sidebarMeetings}
            onMeetingClick={setSelectedMeetingId}
          />
        )}
      </div>

      {/* ─── Dialogs ─── */}
      {selectedMeetingId && (
        <MeetingDetailDialog
          meetingId={selectedMeetingId}
          userId={userId}
          open
          onOpenChange={(open) => !open && setSelectedMeetingId(null)}
        />
      )}
      <CreateMeetingDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        userId={userId}
      />
    </div>
  );
}

// ─── Day Column ─────────────────────────────────────────────
function DayColumn({
  day,
  meetings,
  hours,
  isSelected,
  onMeetingClick,
}: {
  day: Date;
  meetings: MeetingWithContact[];
  hours: number[];
  isSelected: boolean;
  onMeetingClick: (id: string) => void;
}) {
  const td = isToday(day);
  return (
    <div
      className={cn(
        "flex-1 relative border-l first:border-l-0 min-w-0",
        td && "bg-primary/[0.02]",
        isSelected && !td && "bg-muted/20"
      )}
    >
      {hours.map((h, i) => (
        <div key={h}>
          <div
            className="absolute w-full border-t border-border/40"
            style={{ top: `${(i / TOTAL_HOURS) * 100}%` }}
          />
          <div
            className="absolute w-full border-t border-border/[0.12]"
            style={{ top: `${((i + 0.5) / TOTAL_HOURS) * 100}%` }}
          />
        </div>
      ))}
      <div className="absolute w-full border-t border-border/40 bottom-0" />

      {meetings.map((m) => (
        <EventBlock
          key={m.id}
          meeting={m}
          onClick={() => onMeetingClick(m.id)}
        />
      ))}

      {td && <NowLine />}
    </div>
  );
}

// ─── Event Block (percentage-positioned) ────────────────────
function EventBlock({
  meeting,
  onClick,
}: {
  meeting: MeetingWithContact;
  onClick: () => void;
}) {
  const start = new Date(meeting.scheduled_at);
  const mins = (getHours(start) - START_HOUR) * 60 + getMinutes(start);
  const dur = meeting.duration_minutes || 30;
  const topPct = toTopPct(mins);
  const hPct = toHeightPct(dur);
  const contact = meeting.contacts;
  const past = isPast(start);

  const clr =
    meeting.status === "cancelled"
      ? "bg-muted/80 text-muted-foreground border-l-muted-foreground/40 line-through"
      : meeting.status === "completed"
        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-l-emerald-500 hover:bg-emerald-200 dark:hover:bg-emerald-800/40"
        : past
          ? "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-l-amber-500 hover:bg-amber-200 dark:hover:bg-amber-800/40"
          : "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-l-blue-500 hover:bg-blue-200 dark:hover:bg-blue-800/40";

  return (
    <button
      onClick={onClick}
      className={cn(
        "absolute left-0.5 right-0.5 rounded border-l-[3px] px-1.5 py-[2px] text-left overflow-hidden",
        "transition-colors cursor-pointer z-10 min-h-[18px]",
        clr
      )}
      style={{ top: `${topPct}%`, height: `${hPct}%` }}
    >
      <p className="text-[11px] font-semibold truncate leading-tight">
        {format(start, "h:mm")} {meeting.title}
      </p>
      {hPct > 5.5 && contact && (
        <p className="text-[10px] opacity-70 truncate leading-tight">
          {contact.first_name} {contact.last_name || ""}
        </p>
      )}
    </button>
  );
}

// ─── Now Line ───────────────────────────────────────────────
function NowLine() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const mins = (getHours(now) - START_HOUR) * 60 + getMinutes(now);
  const pct = toTopPct(mins);
  if (pct <= 0 || pct >= 100) return null;

  return (
    <div
      className="absolute left-0 right-0 z-20 pointer-events-none"
      style={{ top: `${pct}%` }}
    >
      <div className="flex items-center">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-[5px] shrink-0" />
        <div className="flex-1 h-[2px] bg-red-500" />
      </div>
    </div>
  );
}

// ─── Sidebar ────────────────────────────────────────────────
function Sidebar({
  day,
  meetings,
  onMeetingClick,
}: {
  day: Date;
  meetings: MeetingWithContact[];
  onMeetingClick: (id: string) => void;
}) {
  const td = isToday(day);
  return (
    <div className="w-64 xl:w-72 border-l shrink-0 flex flex-col bg-card">
      {/* Header */}
      <div className="px-3 py-2.5 border-b shrink-0">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
          {td ? "Today" : format(day, "EEEE")}
        </p>
        <p className="text-sm font-bold mt-0.5">{format(day, "MMMM d, yyyy")}</p>
        <p className="text-[11px] text-muted-foreground">
          {meetings.length === 0
            ? "No meetings"
            : `${meetings.length} meeting${meetings.length > 1 ? "s" : ""}`}
        </p>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1.5">
          {meetings.length === 0 ? (
            <div className="text-center py-10">
              <Calendar className="h-7 w-7 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                {td ? "Your day is clear" : "Nothing scheduled"}
              </p>
            </div>
          ) : (
            meetings.map((m) => (
              <SidebarCard
                key={m.id}
                meeting={m}
                onClick={() => onMeetingClick(m.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── Sidebar Card ───────────────────────────────────────────
function SidebarCard({
  meeting,
  onClick,
}: {
  meeting: MeetingWithContact;
  onClick: () => void;
}) {
  const start = new Date(meeting.scheduled_at);
  const end = addMinutes(start, meeting.duration_minutes || 30);
  const contact = meeting.contacts;
  const pastDue = isPast(start) && meeting.status === "scheduled";

  const accent =
    meeting.status === "cancelled"
      ? "bg-muted-foreground/40"
      : meeting.status === "completed"
        ? "bg-emerald-500"
        : pastDue
          ? "bg-amber-500"
          : "bg-blue-500";

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-2.5 rounded-lg border transition-all",
        "hover:shadow-sm hover:border-border/80",
        meeting.status === "cancelled" && "opacity-50"
      )}
    >
      <div className="flex gap-2.5">
        {/* Accent bar */}
        <div className={cn("w-1 rounded-full shrink-0 self-stretch min-h-[40px]", accent)} />

        <div className="flex-1 min-w-0">
          {/* Time range */}
          <p className="text-[11px] font-medium text-muted-foreground">
            {format(start, "h:mm a")} – {format(end, "h:mm a")}
          </p>

          {/* Title */}
          <p
            className={cn(
              "font-semibold text-sm leading-snug mt-0.5",
              meeting.status === "cancelled" && "line-through"
            )}
          >
            {meeting.title}
          </p>

          {/* Contact info */}
          {contact && (
            <div className="mt-1 space-y-0.5">
              <p className="text-[11px] text-foreground/80 flex items-center gap-1">
                <User className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="truncate">
                  {contact.first_name} {contact.last_name || ""}
                  {contact.title ? ` \u00B7 ${contact.title}` : ""}
                </span>
              </p>
              {contact.company_name && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3 shrink-0" />
                  <span className="truncate">{contact.company_name}</span>
                </p>
              )}
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              {meeting.duration_minutes || 30}m
            </span>
            {meeting.location && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 truncate max-w-[100px]">
                <MapPin className="h-2.5 w-2.5 shrink-0" />
                {meeting.location}
              </span>
            )}
            {meeting.meeting_link && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Video className="h-2.5 w-2.5" />
                Link
              </span>
            )}
          </div>

          {/* Status badge */}
          {meeting.status === "completed" && (
            <Badge className="text-[9px] px-1.5 h-4 mt-1.5 bg-emerald-500 hover:bg-emerald-500">
              Completed
            </Badge>
          )}
          {pastDue && (
            <Badge
              variant="secondary"
              className="text-[9px] px-1.5 h-4 mt-1.5 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
            >
              Past due
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Month View ─────────────────────────────────────────────
function MonthView({
  currentDate,
  meetings,
  onMeetingClick,
  onDayClick,
}: {
  currentDate: Date;
  meetings: MeetingWithContact[];
  onMeetingClick: (id: string) => void;
  onDayClick: (date: Date) => void;
}) {
  const ms = startOfMonth(currentDate);
  const me = endOfMonth(currentDate);
  const cs = startOfWeek(ms, { weekStartsOn: 0 });
  const ce = endOfWeek(me, { weekStartsOn: 0 });

  const days: Date[] = [];
  let d = cs;
  while (d <= ce) {
    days.push(d);
    d = addDays(d, 1);
  }

  const getMtgs = (date: Date) =>
    meetings
      .filter((m) => isSameDay(new Date(m.scheduled_at), date))
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  return (
    <div className="flex flex-col h-full p-2">
      <div className="grid grid-cols-7 mb-0.5">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((n) => (
          <div
            key={n}
            className="text-center text-[10px] font-medium text-muted-foreground py-1 uppercase tracking-widest"
          >
            {n}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 flex-1 auto-rows-fr border-t border-l">
        {days.map((day) => {
          const dm = getMtgs(day);
          const inM = isSameMonth(day, currentDate);
          const td = isToday(day);
          return (
            <div
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className={cn(
                "border-r border-b p-1 cursor-pointer transition-colors overflow-hidden",
                inM ? "bg-card" : "bg-muted/30",
                td && "bg-primary/5",
                "hover:bg-muted/50"
              )}
            >
              <div className="flex justify-end">
                <span
                  className={cn(
                    "text-xs leading-none",
                    td &&
                      "bg-primary text-primary-foreground font-semibold rounded-full w-5 h-5 flex items-center justify-center",
                    !td && inM && "text-foreground",
                    !td && !inM && "text-muted-foreground/50"
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>
              <div className="mt-0.5 space-y-px">
                {dm.slice(0, 3).map((m) => {
                  const s = new Date(m.scheduled_at);
                  const past = isPast(s);
                  const bg =
                    m.status === "cancelled"
                      ? "bg-muted text-muted-foreground line-through"
                      : m.status === "completed"
                        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300"
                        : past
                          ? "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300"
                          : "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300";
                  return (
                    <button
                      key={m.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMeetingClick(m.id);
                      }}
                      className={cn(
                        "w-full text-left text-[10px] px-1 py-[1px] rounded truncate font-medium leading-tight hover:opacity-80",
                        bg
                      )}
                    >
                      <span className="opacity-70">{format(s, "h:mm")}</span>{" "}
                      {m.title}
                    </button>
                  );
                })}
                {dm.length > 3 && (
                  <p className="text-[9px] text-muted-foreground font-medium pl-1">
                    +{dm.length - 3} more
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
