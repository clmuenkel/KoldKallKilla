"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { SidebarSkeleton } from "@/components/layout/sidebar-skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CommandPalette } from "@/components/layout/command-palette";
import { GlobalSessionBar } from "@/components/dialer/mini-session-bar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-background">
        {/* Show skeleton sidebar until client-side mounted */}
        {!mounted ? <SidebarSkeleton /> : <Sidebar />}
        <main className="flex-1 flex flex-col overflow-hidden transition-all duration-300">
          {/* Global session bar - shows when dialer session is active */}
          {mounted && <GlobalSessionBar />}
          <div className={`flex-1 overflow-auto ${mounted ? "animate-fade-in" : ""}`}>
            {children}
          </div>
        </main>
        <CommandPalette />
      </div>
    </TooltipProvider>
  );
}
