"use client";

import { useEffect, useRef } from "react";
import { useDialerStore } from "@/stores/dialer-store";

export function useCallTimer() {
  const { isCallActive, callStartTime, updateDuration } = useDialerStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isCallActive && callStartTime) {
      intervalRef.current = setInterval(() => {
        const now = new Date();
        const seconds = Math.floor((now.getTime() - callStartTime.getTime()) / 1000);
        updateDuration(seconds);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isCallActive, callStartTime, updateDuration]);
}
