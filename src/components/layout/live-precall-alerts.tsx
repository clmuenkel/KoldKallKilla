"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Phone } from "lucide-react";
import { useTodaysReminders, cstTime } from "@/hooks/use-reminders";
import { useIsPrimaryUser } from "@/hooks/use-primary-user";

/**
 * Fires a live pop-up ~30 and ~20 minutes before each of today's meetings
 * (while the CRM tab is open) so Zad makes the confirmation calls on time.
 * Each fires once per session.
 */
export function LivePreCallAlerts() {
  const isPrimary = useIsPrimaryUser();
  const { allEventsActions } = useTodaysReminders();
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isPrimary) return;

    const check = () => {
      const now = Date.now();
      for (const a of allEventsActions) {
        if (a.actionType !== "call_30" && a.actionType !== "call_20") continue;
        if (!a.fireAt) continue;
        const fire = new Date(a.fireAt).getTime();
        // Fire within a window after the target moment (covers a closed/sleeping tab).
        if (fire <= now && now - fire < 3 * 60000 && !firedRef.current.has(a.key)) {
          firedRef.current.add(a.key);
          const mins = a.actionType === "call_30" ? 30 : 20;
          toast(`📞 Call ${a.who} now`, {
            description: `${mins} min before ${a.meetingTitle} (${cstTime(a.meetingStart)} CT)${a.phone ? ` · ${a.phone}` : ""}`,
            icon: <Phone className="h-4 w-4 text-emerald-500" />,
            duration: 60000,
          });
        }
      }
    };

    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [isPrimary, allEventsActions]);

  return null;
}
