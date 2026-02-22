import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

/**
 * Add business days to a date, skipping weekends (Saturday and Sunday)
 * @param date - Starting date
 * @param days - Number of business days to add
 * @returns New date after adding business days
 */
export function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    // Skip Saturday (6) and Sunday (0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      added++;
    }
  }
  return result;
}

/**
 * Format a date as YYYY-MM-DD for database storage
 */
export function formatDateForDB(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Check if a date is today or in the past (for "due" contacts).
 * Parses YYYY-MM-DD as local date so "due today" is correct in all timezones.
 */
export function isDueOrNew(dateStr: string | null): boolean {
  if (!dateStr) return true; // null = never called, can call
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const parts = dateStr.split("-").map(Number);
  const callDate = parts.length === 3
    ? new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0)
    : new Date(dateStr);
  return callDate <= today;
}

/**
 * Check if a paused contact should be unpaused (pause period expired)
 */
export function isPauseExpired(pausedUntil: string | null): boolean {
  if (!pausedUntil) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const pauseDate = new Date(pausedUntil);
  return pauseDate <= today;
}

/**
 * Add calendar days to a date (includes weekends)
 * @param date - Starting date
 * @param days - Number of calendar days to add
 * @returns New date after adding calendar days
 */
export function addCalendarDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Add calendar months to a date
 * @param date - Starting date
 * @param months - Number of months to add
 * @returns New date after adding months
 */
export function addCalendarMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Indefinite pause date sentinel - used for "pause indefinitely" 
 */
export const INDEFINITE_PAUSE_DATE = "2099-12-31";
