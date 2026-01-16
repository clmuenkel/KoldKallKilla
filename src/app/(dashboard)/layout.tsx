"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { SidebarSkeleton } from "@/components/layout/sidebar-skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CommandPalette } from "@/components/layout/command-palette";

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
        <main className="flex-1 overflow-auto transition-all duration-300">
          <div className={mounted ? "animate-fade-in" : ""}>
            {children}
          </div>
        </main>
        <CommandPalette />
      </div>
    </TooltipProvider>
  );
}
