"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useContactsByStage } from "@/hooks/use-contacts";
import { STAGES } from "@/lib/constants";
import { ArrowRight, Kanban } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function PipelineOverview() {
  const { data: stageCounts, isLoading } = useContactsByStage();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Kanban className="h-5 w-5" />
            Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const total = Object.values(stageCounts || {}).reduce((a, b) => a + b, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Kanban className="h-5 w-5" />
          Pipeline
        </CardTitle>
        <Link href="/pipeline">
          <Button variant="ghost" size="sm">
            View Board
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Progress bar */}
          <div className="flex h-4 rounded-full overflow-hidden bg-muted">
            {STAGES.filter(s => s.value !== "lost").map((stage) => {
              const count = stageCounts?.[stage.value] || 0;
              const percentage = total > 0 ? (count / total) * 100 : 0;
              if (percentage === 0) return null;

              return (
                <div
                  key={stage.value}
                  className={cn(stage.color, "transition-all")}
                  style={{ width: `${percentage}%` }}
                  title={`${stage.label}: ${count}`}
                />
              );
            })}
          </div>

          {/* Stage breakdown */}
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-7">
            {STAGES.map((stage) => {
              const count = stageCounts?.[stage.value] || 0;

              return (
                <Link
                  key={stage.value}
                  href={`/pipeline?stage=${stage.value}`}
                  className="text-center hover:bg-muted rounded-lg p-2 transition-colors"
                >
                  <div className={cn("h-2 w-2 rounded-full mx-auto mb-1", stage.color)} />
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground">{stage.label}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
