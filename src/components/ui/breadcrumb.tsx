"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
  className?: string;
}

export function Breadcrumb({ items, showHome = true, className }: BreadcrumbProps) {
  const allItems = showHome 
    ? [{ label: "Home", href: "/dashboard" }, ...items]
    : items;

  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center", className)}>
      <ol className="flex items-center gap-1 text-sm">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;
          const isFirst = index === 0;

          return (
            <li key={index} className="flex items-center gap-1">
              {index > 0 && (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
              )}
              {isLast ? (
                <span 
                  className="font-medium text-foreground truncate max-w-[200px]"
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : item.href ? (
                <Link
                  href={item.href}
                  className={cn(
                    "text-muted-foreground hover:text-foreground transition-colors",
                    "flex items-center gap-1"
                  )}
                >
                  {isFirst && showHome && (
                    <Home className="h-3.5 w-3.5" />
                  )}
                  <span className="truncate max-w-[150px]">
                    {isFirst && showHome ? "" : item.label}
                  </span>
                </Link>
              ) : (
                <span className="text-muted-foreground flex items-center gap-1">
                  {isFirst && showHome && (
                    <Home className="h-3.5 w-3.5" />
                  )}
                  <span className="truncate max-w-[150px]">
                    {isFirst && showHome ? "" : item.label}
                  </span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
