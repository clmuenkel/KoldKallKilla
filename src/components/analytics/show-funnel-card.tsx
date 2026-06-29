"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarCheck } from "lucide-react";
import { useMeetingShowFunnel } from "@/hooks/use-analytics";
import type { DateRange } from "@/types/analytics";

/**
 * "Show funnel by meeting #": of the meetings that came due, what share showed up,
 * split by whether it was the prospect's 1st / 2nd / 3rd / 4th+ meeting.
 */
export function ShowFunnelCard({
  range,
  customStart,
  customEnd,
}: {
  range: DateRange;
  customStart?: string;
  customEnd?: string;
}) {
  const { data, isLoading } = useMeetingShowFunnel(range, customStart, customEnd);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-emerald-500" />
          Show rate by meeting #
        </CardTitle>
        <CardDescription>
          Who actually shows up to the 1st meeting vs the follow-ups.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No meetings have come due in this range yet. (Link a contact to a meeting
            so it counts here.)
          </p>
        ) : (
          <div className="space-y-3">
            {data.map((row) => (
              <div key={row.position}>
                <div className="flex items-baseline justify-between text-sm mb-1">
                  <span className="font-medium">{row.label}</span>
                  <span className="text-muted-foreground">
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      {row.showRate}%
                    </span>{" "}
                    showed · {row.held}/{row.due}
                    {row.noShow > 0 && (
                      <span className="text-rose-500"> · {row.noShow} no-show</span>
                    )}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${row.showRate}%` }}
                  />
                </div>
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground pt-1">
              Counts meetings that came due in the selected range, by the prospect&apos;s
              meeting number. Set a meeting&apos;s number in its detail to override.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
