"use client";

import { useState, useEffect } from "react";
import { useDialerStore } from "@/stores/dialer-store";

export function useSessionDuration(): number {
  const sessionStartTime = useDialerStore((s) => s.sessionStartTime);
  const pausedAt = useDialerStore((s) => s.pausedAt);
  const totalPausedSeconds = useDialerStore((s) => s.totalPausedSeconds);

  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!sessionStartTime) {
      setSeconds(0);
      return;
    }

    if (pausedAt) {
      const frozen = Math.floor((pausedAt.getTime() - sessionStartTime.getTime()) / 1000 - totalPausedSeconds);
      setSeconds(Math.max(0, frozen));
      return;
    }

    const tick = () => {
      const elapsed = Math.floor((Date.now() - sessionStartTime.getTime()) / 1000 - totalPausedSeconds);
      setSeconds(Math.max(0, elapsed));
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [sessionStartTime, pausedAt, totalPausedSeconds]);

  return seconds;
}
