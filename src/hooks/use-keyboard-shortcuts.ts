"use client";

import { useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  action: () => void;
  description?: string;
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
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase() ||
          (shortcut.key === " " && event.code === "Space");
        // Only enforce modifier if explicitly specified (true/false), otherwise don't care
        const ctrlMatch = shortcut.ctrl === undefined ? true : (shortcut.ctrl === event.ctrlKey);
        const metaMatch = shortcut.meta === undefined ? true : (shortcut.meta === event.metaKey);
        const shiftMatch = shortcut.shift === undefined ? true : (shortcut.shift === event.shiftKey);

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

// Dialer-specific shortcuts with full support
export interface DialerShortcutHandlers {
  onDial: () => void;
  onEndCall: () => void;
  onSkip: () => void;
  onSaveAndNext: () => void;
  onFocusNotes: () => void;
  onOutcome: (outcome: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  isCallActive: boolean;
  canSave: boolean;
}

export function useDialerShortcuts({
  onDial,
  onEndCall,
  onSkip,
  onSaveAndNext,
  onFocusNotes,
  onOutcome,
  onPrevious,
  onNext,
  isCallActive,
  canSave,
}: DialerShortcutHandlers) {
  // Outcome mapping: 1-5 keys map to outcomes
  const outcomeMap: Record<string, string> = {
    "1": "connected",
    "2": "voicemail",
    "3": "no_answer",
    "4": "ai_screener",
    "5": "wrong_number",
  };

  useKeyboardShortcuts([
    // Space toggles call start/end
    { 
      key: " ", 
      action: () => isCallActive ? onEndCall() : onDial(),
      description: isCallActive ? "End call" : "Start call"
    },
    // S = Skip
    { 
      key: "s", 
      action: onSkip,
      description: "Skip contact"
    },
    // Enter = Save & Next (only when outcome selected)
    { 
      key: "Enter", 
      action: () => canSave && onSaveAndNext(),
      description: "Save & Next"
    },
    // N = Focus notes
    { 
      key: "n", 
      action: onFocusNotes,
      description: "Focus notes"
    },
    // 1-5 = Quick outcome selection
    { key: "1", action: () => onOutcome(outcomeMap["1"]), description: "Connected" },
    { key: "2", action: () => onOutcome(outcomeMap["2"]), description: "Voicemail" },
    { key: "3", action: () => onOutcome(outcomeMap["3"]), description: "No Answer" },
    { key: "4", action: () => onOutcome(outcomeMap["4"]), description: "AI Screener" },
    { key: "5", action: () => onOutcome(outcomeMap["5"]), description: "Wrong #" },
    // Arrow keys for navigation
    { 
      key: "ArrowLeft", 
      action: onPrevious,
      description: "Previous contact"
    },
    { 
      key: "ArrowRight", 
      action: onNext,
      description: "Next contact"
    },
  ]);
}

// Hook to show keyboard shortcuts help
export function useShortcutsHelp() {
  const [showHelp, setShowHelp] = useState(false);

  useKeyboardShortcuts([
    { key: "?", action: () => setShowHelp(prev => !prev), description: "Toggle help" },
    { key: "Escape", action: () => setShowHelp(false), description: "Close help" },
  ]);

  return { showHelp, setShowHelp };
}

// Dialer shortcuts definition for display
export const DIALER_SHORTCUTS = [
  { key: "Space", description: "Start/End call" },
  { key: "S", description: "Skip contact" },
  { key: "Enter", description: "Save & Next" },
  { key: "N", description: "Focus notes" },
  { key: "1", description: "Connected" },
  { key: "2", description: "Voicemail" },
  { key: "3", description: "No Answer" },
  { key: "4", description: "AI Screener" },
  { key: "5", description: "Wrong Number" },
  { key: "←/→", description: "Navigate contacts" },
  { key: "⌘D", description: "Delete contact" },
  { key: "⌘P", description: "Remove from dialer pool" },
  { key: "?", description: "Toggle shortcuts" },
] as const;
