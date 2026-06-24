"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { SidebarSkeleton } from "@/components/layout/sidebar-skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CommandPalette } from "@/components/layout/command-palette";
import { GlobalSessionBar } from "@/components/dialer/mini-session-bar";
import { FollowUpAlertBanner } from "@/components/layout/followup-alert-banner";
import { MorningReminders } from "@/components/layout/morning-reminders";
import { LivePreCallAlerts } from "@/components/layout/live-precall-alerts";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const mobileNavOpen = useUIStore((s) => s.mobileNavOpen);
  const setMobileNavOpen = useUIStore((s) => s.setMobileNavOpen);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname, setMobileNavOpen]);

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-background">
        {/* Desktop sidebar — hidden on phones, where the drawer takes over */}
        <div className="hidden md:flex shrink-0">
          {!mounted ? <SidebarSkeleton /> : <Sidebar />}
        </div>

        <main className="flex-1 flex flex-col overflow-hidden transition-all duration-300 min-w-0">
          {/* Global session bar - shows when dialer session is active */}
          {mounted && <GlobalSessionBar />}
          {/* Follow-ups due + missed meetings alert */}
          {mounted && <FollowUpAlertBanner />}
          <div className={`flex-1 overflow-auto ${mounted ? "animate-fade-in" : ""}`}>
            {children}
          </div>
        </main>

        {/* Mobile nav drawer (slides in from the left) */}
        {mounted && (
          <div className={cn("fixed inset-0 z-50 md:hidden", !mobileNavOpen && "pointer-events-none")}>
            <div
              onClick={() => setMobileNavOpen(false)}
              className={cn(
                "absolute inset-0 bg-black/50 transition-opacity duration-300",
                mobileNavOpen ? "opacity-100" : "opacity-0"
              )}
            />
            <div
              className={cn(
                "absolute inset-y-0 left-0 w-72 max-w-[82%] shadow-2xl transition-transform duration-300 ease-in-out",
                mobileNavOpen ? "translate-x-0" : "-translate-x-full"
              )}
            >
              <Sidebar mobile onNavigate={() => setMobileNavOpen(false)} />
            </div>
          </div>
        )}

        {/* Morning meeting-reminder pop-up + live pre-call alerts */}
        {mounted && <MorningReminders />}
        {mounted && <LivePreCallAlerts />}
        <CommandPalette />
      </div>
    </TooltipProvider>
  );
}
