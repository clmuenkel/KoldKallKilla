"use client";

import { Header } from "@/components/layout/header";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { TodayTasks } from "@/components/dashboard/today-tasks";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { PipelineOverview } from "@/components/dashboard/pipeline-overview";
import { Button } from "@/components/ui/button";
import { AbuButton } from "@/components/ui/abu-button";
import { Phone, Download, Zap, Target } from "lucide-react";
import Link from "next/link";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const greeting = getGreeting();

  return (
    <div className="flex flex-col h-full">
      <Header title="Dashboard" />
      
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Greeting & Quick Actions */}
        <div 
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 opacity-0 animate-fade-in"
          style={{ animationDelay: "0ms", animationFillMode: "forwards" }}
        >
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{greeting}!</h2>
            <p className="text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              Today's target: <span className="font-medium text-foreground">50 calls</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/dialer">
              <Button size="lg" className="gap-2 shadow-lg shadow-primary/25 press-scale">
                <Zap className="h-5 w-5" />
                Start Calling
              </Button>
            </Link>
            <Link href="/import">
              <Button size="lg" variant="outline" className="gap-2 press-scale">
                <Download className="h-5 w-5" />
                Import Leads
              </Button>
            </Link>
            <AbuButton size="lg" />
          </div>
        </div>

        {/* Stats Cards */}
        <div 
          className="opacity-0 animate-fade-in"
          style={{ animationDelay: "50ms", animationFillMode: "forwards" }}
        >
          <StatsCards />
        </div>

        {/* Pipeline Overview */}
        <div 
          className="opacity-0 animate-fade-in"
          style={{ animationDelay: "100ms", animationFillMode: "forwards" }}
        >
          <PipelineOverview />
        </div>

        {/* Two Column Layout */}
        <div 
          className="grid gap-6 lg:grid-cols-2 opacity-0 animate-fade-in"
          style={{ animationDelay: "150ms", animationFillMode: "forwards" }}
        >
          <TodayTasks />
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}
