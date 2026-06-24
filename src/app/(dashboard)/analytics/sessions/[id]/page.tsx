"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone } from "lucide-react";
import { format } from "date-fns";
import { useSessionDetail } from "@/hooks/use-sessions";
import { CALL_OUTCOMES, CALL_DISPOSITIONS, PICKUP_DISPOSITIONS } from "@/lib/constants";

function fmtDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const OUTCOME_LABEL: Record<string, string> = Object.fromEntries(
  CALL_OUTCOMES.map((o) => [o.value, o.label])
);
const DISPO_LABEL: Record<string, string> = Object.fromEntries(
  [...CALL_DISPOSITIONS, ...PICKUP_DISPOSITIONS].map((d) => [d.value, d.label])
);

export default function SessionDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data, isLoading } = useSessionDetail(id);

  return (
    <div className="flex flex-col h-full">
      <Header title="Session Detail" showSearch={false} />
      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-6">
        <Link href="/analytics">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Analytics
          </Button>
        </Link>

        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : !data ? (
          <p className="text-muted-foreground">Session not found.</p>
        ) : (
          <>
            {/* Session header */}
            <div>
              <h2 className="text-2xl font-bold">
                {format(new Date(data.session.started_at), "EEEE, MMM d yyyy")}
              </h2>
              <p className="text-muted-foreground">
                {format(new Date(data.session.started_at), "h:mm a")}
                {data.session.ended_at
                  ? ` – ${format(new Date(data.session.ended_at), "h:mm a")}`
                  : " – in progress"}
                {" · "}
                {fmtDuration(data.metrics.durationSeconds)}
              </p>
            </div>

            {/* Metrics */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
              <Metric label="Calls" value={data.metrics.totalCalls} />
              <Metric label="Connected" value={data.metrics.connected} className="text-green-500" />
              <Metric label="Answer Rate" value={`${data.metrics.answerRate}%`} />
              <Metric label="Meetings" value={data.metrics.meetingsBooked} className="text-purple-500" />
              <Metric label="Set Rate" value={`${data.metrics.setRate}%`} />
              <Metric label="Voicemails" value={data.metrics.voicemails} />
              <Metric label="Talk Time" value={fmtDuration(data.metrics.talkTimeSeconds)} />
            </div>

            {/* Calls in this session */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Calls ({data.calls.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.calls.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    No calls linked to this session. (Sessions started before the session-tracking
                    fix don&apos;t have linked calls.)
                  </p>
                ) : (
                  <div className="divide-y">
                    {data.calls.map((c) => (
                      <div key={c.id} className="flex items-center gap-3 py-2.5">
                        <span className="text-xs text-muted-foreground w-16 shrink-0">
                          {format(new Date(c.started_at), "h:mm a")}
                        </span>
                        <div className="flex-1 min-w-0">
                          {c.contact ? (
                            <Link
                              href={`/contacts/${c.contact.id}`}
                              className="font-medium text-sm hover:underline"
                            >
                              {c.contact.first_name} {c.contact.last_name}
                            </Link>
                          ) : (
                            <span className="font-medium text-sm">Unknown contact</span>
                          )}
                          {c.contact?.company_name && (
                            <span className="text-xs text-muted-foreground ml-2">
                              {c.contact.company_name}
                            </span>
                          )}
                          {c.notes && (
                            <p className="text-xs text-muted-foreground truncate">{c.notes}</p>
                          )}
                        </div>
                        <Badge
                          variant={c.outcome === "connected" ? "default" : "secondary"}
                          className="text-[10px] shrink-0"
                        >
                          {OUTCOME_LABEL[c.outcome] || c.outcome}
                        </Badge>
                        {c.disposition && (
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {DISPO_LABEL[c.disposition] || c.disposition}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  className,
}: {
  label: string;
  value: string | number;
  className?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className={`text-2xl font-bold ${className ?? ""}`}>{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
