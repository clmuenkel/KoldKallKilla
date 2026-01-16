"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function SidebarSkeleton() {
  return (
    <div className="flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground">
      {/* Logo area */}
      <div className="flex h-16 items-center gap-2 px-4">
        <Skeleton className="h-9 w-9 rounded-lg bg-sidebar-foreground/10" />
        <Skeleton className="h-6 w-24 bg-sidebar-foreground/10" />
      </div>

      {/* Navigation items */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5"
          >
            <Skeleton className="h-5 w-5 rounded bg-sidebar-foreground/10" />
            <Skeleton className="h-4 w-20 bg-sidebar-foreground/10" />
          </div>
        ))}
      </nav>

      {/* Separator */}
      <div className="mx-2 h-px bg-sidebar-foreground/10" />

      {/* Bottom section */}
      <div className="p-2 space-y-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5"
          >
            <Skeleton className="h-5 w-5 rounded bg-sidebar-foreground/10" />
            <Skeleton className="h-4 w-16 bg-sidebar-foreground/10" />
          </div>
        ))}
      </div>
    </div>
  );
}
