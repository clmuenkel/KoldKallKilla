"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, CheckCircle2 } from "lucide-react";
import { useOutlookUrl, useSaveOutlookUrl, useOutlookEvents } from "@/hooks/use-outlook";
import { toast } from "sonner";

/** Settings: paste your published Outlook calendar (.ics) share link. */
export function OutlookCalendarCard() {
  const { data: savedUrl } = useOutlookUrl();
  const save = useSaveOutlookUrl();
  const { data: events, isFetching, error } = useOutlookEvents();
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (savedUrl != null) setUrl(savedUrl);
  }, [savedUrl]);

  const onSave = async () => {
    try {
      await save.mutateAsync(url.trim() || null);
      toast.success(url.trim() ? "Outlook calendar connected" : "Calendar disconnected");
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5" />
          Calendar
          {savedUrl && !error && events && (
            <Badge className="bg-emerald-500 text-white text-[10px]">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {events.length} upcoming
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Paste your private calendar link (.ics) so meeting reminders can read your schedule.
          Google Calendar: Settings → click your calendar → Integrate calendar → copy the
          &ldquo;Secret address in iCal format.&rdquo; (Outlook&apos;s published ICS link works too.)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="ics">Calendar ICS / secret iCal URL</Label>
          <div className="flex gap-2">
            <Input
              id="ics"
              value={url}
              placeholder="https://calendar.google.com/calendar/ical/.../private-.../basic.ics"
              onChange={(e) => setUrl(e.target.value)}
              className="font-mono text-xs"
            />
            <Button onClick={onSave} disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
        {savedUrl && error && (
          <p className="text-xs text-destructive">
            Couldn&apos;t read that calendar: {(error as Error).message}. Make sure it&apos;s the
            published ICS link (not the webpage).
          </p>
        )}
        {savedUrl && !error && (
          <p className="text-xs text-muted-foreground">
            {isFetching ? "Reading your calendar…" : `Connected. ${events?.length ?? 0} meetings in the next 3 weeks.`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
