"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
  collapsed?: boolean;
}

export function ThemeToggle({ className, showLabel = false, collapsed = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size={collapsed ? "icon" : "default"}
        className={cn("justify-start", className)}
        disabled
      >
        <Sun className="h-5 w-5" />
        {showLabel && !collapsed && <span className="ml-3">Theme</span>}
      </Button>
    );
  }

  const isDark = theme === "dark";

  return (
    <Button
      variant="ghost"
      size={collapsed ? "icon" : "default"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn("justify-start", className)}
    >
      {isDark ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
      {showLabel && !collapsed && (
        <span className="ml-3">{isDark ? "Light Mode" : "Dark Mode"}</span>
      )}
    </Button>
  );
}
