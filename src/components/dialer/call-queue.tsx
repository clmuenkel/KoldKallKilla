"use client";

import { useDialerStore } from "@/stores/dialer-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Phone, Check, SkipForward } from "lucide-react";

export function CallQueue() {
  const { queue, currentIndex, goToContact } = useDialerStore();

  return (
    <>
      <div className="p-4 border-b">
        <h3 className="font-semibold">Call Queue</h3>
        <p className="text-sm text-muted-foreground">
          {currentIndex + 1} of {queue.length}
        </p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {queue.map((contact, index) => {
            const isCurrent = index === currentIndex;
            const isPast = index < currentIndex;

            return (
              <button
                key={contact.id}
                onClick={() => goToContact(index)}
                className={cn(
                  "w-full text-left p-3 rounded-lg transition-colors",
                  isCurrent
                    ? "bg-primary text-primary-foreground"
                    : isPast
                    ? "bg-muted/50 text-muted-foreground"
                    : "hover:bg-muted"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium",
                      isCurrent
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : isPast
                        ? "bg-green-100 text-green-600"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {isPast ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {contact.first_name} {contact.last_name}
                    </p>
                    <p
                      className={cn(
                        "text-xs truncate",
                        isCurrent
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      )}
                    >
                      {contact.company_name || contact.title || "No company"}
                    </p>
                  </div>
                  {isCurrent && (
                    <Phone className="h-4 w-4 animate-pulse" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </>
  );
}
