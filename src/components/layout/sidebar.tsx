"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSidebarState } from "@/stores/ui-store";
import { useTasks } from "@/hooks/use-tasks";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Badge, CountBadge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Users,
  Building2,
  Phone,
  Kanban,
  CheckSquare,
  Mail,
  Download,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Zap,
  Calendar,
  CalendarCheck,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

// Navigation items organized by section
const navigationSections = [
  {
    title: "Overview",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Analytics", href: "/analytics", icon: BarChart3 },
    ],
  },
  {
    title: "Sales",
    items: [
      { name: "Power Dialer", href: "/dialer", icon: Phone, accent: true },
      { name: "Contacts", href: "/contacts", icon: Users },
      { name: "Companies", href: "/companies", icon: Building2 },
      { name: "Pipeline", href: "/pipeline", icon: Kanban },
    ],
  },
  {
    title: "Organize",
    items: [
      { name: "Calendar", href: "/calendar", icon: Calendar },
      { name: "Meetings", href: "/meetings", icon: CalendarCheck },
      { name: "Tasks", href: "/tasks", icon: CheckSquare, showBadge: true },
      { name: "Templates", href: "/templates", icon: Mail },
    ],
  },
  {
    title: "Data",
    items: [
      { name: "Import", href: "/import", icon: Download },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, toggleSidebar } = useSidebarState();
  
  // Get pending tasks count for badge
  const { data: tasks } = useTasks({});
  const pendingTasksCount = tasks?.filter(t => t.status === "todo" || t.status === "pending").length || 0;

  const handleAbuClick = () => {
    toast.info("Abu email feature coming soon!", {
      description: "This will send your pre-configured follow-up email.",
    });
  };

  return (
    <div
      className={cn(
        "flex h-full flex-col bg-gradient-to-b from-sidebar to-sidebar/95 text-sidebar-foreground transition-all duration-300 ease-in-out overflow-hidden",
        isCollapsed ? "w-[68px]" : "w-64"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex h-16 items-center gap-2.5 px-4 shrink-0 border-b border-sidebar-foreground/10",
        isCollapsed && "justify-center px-2"
      )}>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shrink-0 shadow-lg shadow-primary/20">
          <Phone className="h-5 w-5 text-primary-foreground" />
        </div>
        <span 
          className={cn(
            "text-xl font-bold tracking-tight transition-all duration-300",
            isCollapsed ? "opacity-0 w-0" : "opacity-100"
          )}
        >
          PezCRM
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto px-2">
        {navigationSections.map((section, sectionIndex) => (
          <div key={section.title} className={cn(sectionIndex > 0 && "mt-4")}>
            {/* Section Title */}
            {!isCollapsed && (
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                {section.title}
              </p>
            )}
            
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                const showTaskBadge = item.showBadge && pendingTasksCount > 0;
                
                const linkContent = (
                  <Link
                    href={item.href}
                    className={cn(
                      "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      isCollapsed && "justify-center px-2",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground",
                      item.accent && !isActive && "text-primary hover:text-primary"
                    )}
                  >
                    {/* Active indicator bar */}
                    {isActive && !isCollapsed && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-foreground/80 rounded-r-full" />
                    )}
                    
                    <item.icon className={cn(
                      "h-5 w-5 shrink-0 transition-transform duration-200",
                      isActive && "drop-shadow-sm",
                      item.accent && !isActive && "text-primary"
                    )} />
                    
                    <span 
                      className={cn(
                        "transition-all duration-300 whitespace-nowrap flex-1",
                        isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
                      )}
                    >
                      {item.name}
                    </span>
                    
                    {/* Notification badge */}
                    {showTaskBadge && !isCollapsed && (
                      <CountBadge count={pendingTasksCount} max={99} />
                    )}
                    
                    {/* Collapsed badge indicator */}
                    {showTaskBadge && isCollapsed && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </span>
                    )}
                  </Link>
                );

                if (isCollapsed) {
                  return (
                    <Tooltip key={item.name} delayDuration={0}>
                      <TooltipTrigger asChild>
                        {linkContent}
                      </TooltipTrigger>
                      <TooltipContent side="right" className="font-medium flex items-center gap-2">
                        {item.name}
                        {showTaskBadge && (
                          <Badge variant="destructive" size="sm">{pendingTasksCount}</Badge>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return <div key={item.name}>{linkContent}</div>;
              })}
            </div>
          </div>
        ))}
      </nav>

      <Separator className="bg-sidebar-foreground/10" />

      {/* Bottom section */}
      <div className="p-2 space-y-1 shrink-0">
        {/* Abu Button */}
        {isCollapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                onClick={handleAbuClick}
                className={cn(
                  "w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold",
                  "shadow-lg shadow-amber-500/25",
                  "hover:shadow-xl hover:shadow-amber-500/30",
                  "transition-all duration-200",
                  "justify-center"
                )}
                size="icon"
              >
                <Zap className="h-5 w-5 fill-current" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              Abu Quick Email
            </TooltipContent>
          </Tooltip>
        ) : (
          <Button
            onClick={handleAbuClick}
            className={cn(
              "w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold",
              "shadow-lg shadow-amber-500/25",
              "hover:shadow-xl hover:shadow-amber-500/30",
              "transition-all duration-200",
              "justify-start gap-3 px-3"
            )}
          >
            <Zap className="h-5 w-5 fill-current shrink-0" />
            <span className="whitespace-nowrap">Abu</span>
          </Button>
        )}

        {/* Theme Toggle */}
        {isCollapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <div>
                <ThemeToggle 
                  collapsed={true}
                  className="w-full text-sidebar-foreground/70 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground justify-center" 
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              Toggle Theme
            </TooltipContent>
          </Tooltip>
        ) : (
          <ThemeToggle 
            showLabel 
            className="w-full text-sidebar-foreground/70 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground px-3" 
          />
        )}

        {/* Settings */}
        {isCollapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Link
                href="/settings"
                className={cn(
                  "flex items-center justify-center rounded-lg px-2 py-2.5 text-sm font-medium transition-all duration-200",
                  pathname === "/settings"
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground"
                )}
              >
                <Settings className="h-5 w-5" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              Settings
            </TooltipContent>
          </Tooltip>
        ) : (
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
              pathname === "/settings"
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                : "text-sidebar-foreground/70 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground"
            )}
          >
            <Settings className="h-5 w-5 shrink-0" />
            <span className="whitespace-nowrap">Settings</span>
          </Link>
        )}

        {/* Collapse Toggle */}
        {isCollapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="w-full text-sidebar-foreground/70 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground"
              >
                <PanelLeft className="h-5 w-5 transition-transform duration-200" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              Expand Sidebar
            </TooltipContent>
          </Tooltip>
        ) : (
          <Button
            variant="ghost"
            onClick={toggleSidebar}
            className="w-full justify-start gap-3 px-3 text-sidebar-foreground/70 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground"
          >
            <PanelLeftClose className="h-5 w-5 shrink-0 transition-transform duration-200" />
            <span className="whitespace-nowrap">Collapse</span>
          </Button>
        )}
      </div>
    </div>
  );
}
