"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  action: () => void;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey : true;
        const metaMatch = shortcut.meta ? event.metaKey : true;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;

        if (keyMatch && ctrlMatch && metaMatch && shiftMatch) {
          event.preventDefault();
          shortcut.action();
          return;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

// Global shortcuts hook for the app
export function useGlobalShortcuts() {
  const router = useRouter();

  useKeyboardShortcuts([
    { key: "g", action: () => {} }, // Prefix for go-to commands
  ]);
}

// Dialer-specific shortcuts
export function useDialerShortcuts({
  onDial,
  onCopy,
  onSkip,
  onSaveAndNext,
}: {
  onDial: () => void;
  onCopy: () => void;
  onSkip: () => void;
  onSaveAndNext: () => void;
}) {
  useKeyboardShortcuts([
    { key: "d", action: onDial },
    { key: "c", action: onCopy },
    { key: "s", action: onSkip },
    { key: "Enter", action: onSaveAndNext },
  ]);
}
