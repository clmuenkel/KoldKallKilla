import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground border-border",
        success:
          "border-transparent bg-emerald-500 text-white",
        warning:
          "border-transparent bg-amber-500 text-white",
        // Soft variants with subtle backgrounds
        "soft-primary":
          "border-transparent bg-primary/10 text-primary",
        "soft-success":
          "border-transparent bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        "soft-warning":
          "border-transparent bg-amber-500/10 text-amber-600 dark:text-amber-400",
        "soft-danger":
          "border-transparent bg-red-500/10 text-red-600 dark:text-red-400",
        "soft-info":
          "border-transparent bg-blue-500/10 text-blue-600 dark:text-blue-400",
        // Stage variants for pipeline
        fresh: "border-transparent bg-slate-500 text-white",
        contacted: "border-transparent bg-blue-500 text-white",
        qualified: "border-transparent bg-yellow-500 text-black",
        meeting: "border-transparent bg-purple-500 text-white",
        proposal: "border-transparent bg-orange-500 text-white",
        won: "border-transparent bg-emerald-500 text-white",
        lost: "border-transparent bg-red-500 text-white",
        // Dot indicator (use with size="dot")
        dot: "border-0 bg-current",
      },
      size: {
        default: "px-2.5 py-0.5",
        sm: "px-2 py-0.5 text-[10px]",
        lg: "px-3 py-1 text-sm",
        dot: "h-2 w-2 p-0",
        icon: "h-5 w-5 p-0 justify-center",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  /** Show animated pulse for live indicators */
  pulse?: boolean;
  /** Leading dot indicator */
  dot?: boolean;
  /** Dot color class */
  dotColor?: string;
}

function Badge({ 
  className, 
  variant, 
  size, 
  pulse, 
  dot,
  dotColor = "bg-current",
  children,
  ...props 
}: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {/* Animated pulse dot for live indicators */}
      {pulse && (
        <span className="relative flex h-2 w-2 mr-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
          <span className={cn("relative inline-flex rounded-full h-2 w-2", dotColor)}></span>
        </span>
      )}
      {/* Static leading dot */}
      {dot && !pulse && (
        <span className={cn("h-1.5 w-1.5 rounded-full mr-1.5", dotColor)}></span>
      )}
      {children}
    </div>
  );
}

// Status badge component with leading dot
function StatusBadge({
  status,
  className,
  children,
  ...props
}: {
  status: "online" | "offline" | "busy" | "away";
  className?: string;
  children?: React.ReactNode;
}) {
  const statusConfig = {
    online: { color: "bg-emerald-500", text: "Online" },
    offline: { color: "bg-slate-400", text: "Offline" },
    busy: { color: "bg-red-500", text: "Busy" },
    away: { color: "bg-amber-500", text: "Away" },
  };

  const config = statusConfig[status];

  return (
    <Badge variant="outline" className={cn("gap-1.5", className)} {...props}>
      <span className={cn("h-2 w-2 rounded-full", config.color)}></span>
      {children || config.text}
    </Badge>
  );
}

// Count badge for notifications
function CountBadge({
  count,
  max = 99,
  className,
  ...props
}: {
  count: number;
  max?: number;
  className?: string;
}) {
  const displayCount = count > max ? `${max}+` : count;
  
  if (count === 0) return null;

  return (
    <Badge
      variant="destructive"
      size="icon"
      className={cn("min-w-[1.25rem] h-5 text-[10px] font-bold", className)}
      {...props}
    >
      {displayCount}
    </Badge>
  );
}

// Priority badge component
function PriorityBadge({
  priority,
  className,
  ...props
}: {
  priority: "low" | "medium" | "high" | "urgent";
  className?: string;
}) {
  const priorityConfig = {
    low: { variant: "outline" as const, label: "Low" },
    medium: { variant: "secondary" as const, label: "Medium" },
    high: { variant: "soft-warning" as const, label: "High" },
    urgent: { variant: "destructive" as const, label: "Urgent" },
  };

  const config = priorityConfig[priority];

  return (
    <Badge variant={config.variant} size="sm" className={className} {...props}>
      {config.label}
    </Badge>
  );
}

// Meeting status badge component
function MeetingStatusBadge({
  status,
  isToday,
  isPast,
  className,
  ...props
}: {
  status: "scheduled" | "completed" | "cancelled";
  isToday?: boolean;
  isPast?: boolean;
  className?: string;
}) {
  if (status === "completed") {
    return (
      <Badge variant="soft-success" className={className} {...props}>
        Completed
      </Badge>
    );
  }
  if (status === "cancelled") {
    return (
      <Badge variant="destructive" className={className} {...props}>
        Cancelled
      </Badge>
    );
  }
  if (isToday) {
    return (
      <Badge variant="soft-info" className={className} {...props}>
        Today
      </Badge>
    );
  }
  if (isPast) {
    return (
      <Badge variant="soft-warning" className={className} {...props}>
        Past Due
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={className} {...props}>
      Scheduled
    </Badge>
  );
}

// Stage badge component for pipeline
function StageBadge({
  stage,
  className,
  ...props
}: {
  stage: "fresh" | "contacted" | "qualified" | "meeting" | "proposal" | "won" | "lost";
  className?: string;
}) {
  const stageLabels = {
    fresh: "Fresh",
    contacted: "Contacted",
    qualified: "Qualified",
    meeting: "Meeting Set",
    proposal: "Proposal",
    won: "Won",
    lost: "Lost",
  };

  return (
    <Badge variant={stage} className={className} {...props}>
      {stageLabels[stage]}
    </Badge>
  );
}

export { Badge, StatusBadge, CountBadge, PriorityBadge, MeetingStatusBadge, StageBadge, badgeVariants };
