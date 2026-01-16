"use client";

import { Zap } from "lucide-react";
import { Button } from "./button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AbuButtonProps {
  className?: string;
  size?: "sm" | "default" | "lg" | "icon";
  contactName?: string;
}

export function AbuButton({ className, size = "default", contactName }: AbuButtonProps) {
  const handleClick = () => {
    toast.info("Abu email feature coming soon!", {
      description: contactName 
        ? `This will send your pre-configured follow-up email to ${contactName}.`
        : "This will send your pre-configured follow-up email.",
    });
  };

  return (
    <Button
      onClick={handleClick}
      size={size}
      className={cn(
        "bg-amber-500 hover:bg-amber-600 text-black font-bold",
        "shadow-[0_0_15px_rgba(245,158,11,0.3)]",
        "hover:shadow-[0_0_20px_rgba(245,158,11,0.5)]",
        "transition-all duration-200 active:scale-95",
        className
      )}
    >
      <Zap className={cn("fill-current", size === "icon" ? "h-4 w-4" : "mr-2 h-4 w-4")} />
      {size !== "icon" && "ABU"}
    </Button>
  );
}
