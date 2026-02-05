/**
 * Capacity-based scheduling for cold calling
 * Maintains ~600 due contacts per business day (150 new + 450 follow-ups)
 */

import { createClient } from "@/lib/supabase/client";
import { addBusinessDays, formatDateForDB } from "@/lib/utils";
import type { Contact, CapacitySettings } from "@/types/database";

// Default settings
export const DEFAULT_TARGET_PER_DAY = 600;
export const DEFAULT_NEW_QUOTA_PER_DAY = 150;
export const DEFAULT_SCHEDULE_WINDOW_DAYS = 20;
export const DEFAULT_BLOAT_THRESHOLD = 800;

export interface CapacityBucket {
  date: string; // YYYY-MM-DD
  totalDue: number;
  newDue: number; // total_calls = 0
  followUpDue: number;
}

export interface ScheduleOptions {
  targetPerDay: number;
  newQuotaPerDay: number;
  windowDays: number;
}

export interface ScheduleResult {
  scheduled: number;
  distribution: { date: string; count: number }[];
}

/**
 * Generate a list of the next N business days (Mon-Fri)
 */
export function getBusinessDaysList(startDate: Date, count: number): string[] {
  const days: string[] = [];
  let current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  
  // If start date is a weekend, move to Monday
  const dayOfWeek = current.getDay();
  if (dayOfWeek === 0) current.setDate(current.getDate() + 1); // Sunday -> Monday
  if (dayOfWeek === 6) current.setDate(current.getDate() + 2); // Saturday -> Monday
  
  let added = 0;
  while (added < count) {
    const dow = current.getDay();
    if (dow !== 0 && dow !== 6) { // Skip weekends
      days.push(formatDateForDB(current));
      added++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return days;
}

/**
 * Check if a contact is eligible for the dialer feed
 */
export function isContactEligible(contact: Contact, pausedCompanyIds?: Set<string>): boolean {
  // Must have phone
  if (!contact.phone && !contact.mobile) return false;
  
  // Not paused/exhausted/converted
  if (contact.dialer_status === "paused" || 
      contact.dialer_status === "exhausted" || 
      contact.dialer_status === "converted") {
    return false;
  }
  
  // Max 10 calls
  if ((contact.total_calls || 0) >= 10) return false;
  
  // Company not paused
  if (contact.company_id && pausedCompanyIds?.has(contact.company_id)) {
    return false;
  }
  
  return true;
}

/**
 * Get current capacity buckets for the scheduling window
 */
export async function getCapacityBuckets(
  userId: string,
  windowDays: number = DEFAULT_SCHEDULE_WINDOW_DAYS
): Promise<CapacityBucket[]> {
  const supabase = createClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const businessDays = getBusinessDaysList(today, windowDays);
  
  // Get paused companies
  const { data: pausedCompanies } = await supabase
    .from("companies")
    .select("id, dialer_paused_until")
    .not("dialer_paused_until", "is", null);
  
  const pausedCompanyIds = new Set(
    (pausedCompanies || [])
      .filter(c => c.dialer_paused_until && new Date(c.dialer_paused_until) > today)
      .map(c => c.id)
  );
  
  // Get all eligible contacts with their next_call_date
  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, next_call_date, total_calls, company_id, phone, mobile, dialer_status")
    .eq("user_id", userId)
    .in("next_call_date", businessDays);
  
  // Build buckets
  const bucketMap = new Map<string, CapacityBucket>();
  
  // Initialize all days
  for (const date of businessDays) {
    bucketMap.set(date, {
      date,
      totalDue: 0,
      newDue: 0,
      followUpDue: 0,
    });
  }
  
  // Count eligible contacts per day
  for (const contact of (contacts || [])) {
    if (!isContactEligible(contact as Contact, pausedCompanyIds)) continue;
    if (!contact.next_call_date) continue;
    
    const bucket = bucketMap.get(contact.next_call_date);
    if (bucket) {
      bucket.totalDue++;
      if ((contact.total_calls || 0) === 0) {
        bucket.newDue++;
      } else {
        bucket.followUpDue++;
      }
    }
  }
  
  return Array.from(bucketMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get the count of contacts due today (including overdue)
 */
export async function getDueToday(userId: string): Promise<{
  total: number;
  new: number;
  followUp: number;
  overdue: number;
}> {
  const supabase = createClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = formatDateForDB(today);
  
  // Get paused companies
  const { data: pausedCompanies } = await supabase
    .from("companies")
    .select("id, dialer_paused_until")
    .not("dialer_paused_until", "is", null);
  
  const pausedCompanyIds = new Set(
    (pausedCompanies || [])
      .filter(c => c.dialer_paused_until && new Date(c.dialer_paused_until) > today)
      .map(c => c.id)
  );
  
  // Get contacts due today or earlier (overdue)
  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, next_call_date, total_calls, company_id, phone, mobile, dialer_status")
    .eq("user_id", userId)
    .or(`next_call_date.is.null,next_call_date.lte.${todayStr}`);
  
  let total = 0;
  let newCount = 0;
  let followUpCount = 0;
  let overdueCount = 0;
  
  for (const contact of (contacts || [])) {
    if (!isContactEligible(contact as Contact, pausedCompanyIds)) continue;
    
    total++;
    
    if ((contact.total_calls || 0) === 0) {
      newCount++;
    } else {
      followUpCount++;
    }
    
    // Check if overdue (before today)
    if (contact.next_call_date && contact.next_call_date < todayStr) {
      overdueCount++;
    }
  }
  
  return {
    total,
    new: newCount,
    followUp: followUpCount,
    overdue: overdueCount,
  };
}

/**
 * Find the best day to schedule a contact
 */
function findBestDay(
  buckets: CapacityBucket[],
  isNew: boolean,
  options: ScheduleOptions
): string | null {
  // For new contacts: find day with newDue < quota AND totalDue < target
  // For follow-ups: find day with totalDue < target
  // Prefer least-loaded day within constraints
  
  let bestDay: CapacityBucket | null = null;
  let bestScore = Infinity;
  
  for (const bucket of buckets) {
    // Check constraints
    if (bucket.totalDue >= options.targetPerDay) continue;
    if (isNew && bucket.newDue >= options.newQuotaPerDay) continue;
    
    // Score by total load (prefer less loaded)
    const score = bucket.totalDue;
    if (score < bestScore) {
      bestScore = score;
      bestDay = bucket;
    }
  }
  
  return bestDay?.date || null;
}

/**
 * Helper: chunk an array into smaller arrays
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Schedule a list of contacts across the capacity window
 * Used after import or for bulk distribution
 */
export async function scheduleContacts(
  userId: string,
  contactIds: string[],
  options: Partial<ScheduleOptions> = {}
): Promise<ScheduleResult> {
  const supabase = createClient();
  
  const opts: ScheduleOptions = {
    targetPerDay: options.targetPerDay ?? DEFAULT_TARGET_PER_DAY,
    newQuotaPerDay: options.newQuotaPerDay ?? DEFAULT_NEW_QUOTA_PER_DAY,
    windowDays: options.windowDays ?? DEFAULT_SCHEDULE_WINDOW_DAYS,
  };
  
  // Get capacity buckets
  let buckets = await getCapacityBuckets(userId, opts.windowDays);
  
  // Fetch contact details in chunks (Supabase .in() has URL length limits)
  const CHUNK_SIZE = 50;
  const idChunks = chunkArray(contactIds, CHUNK_SIZE);
  const allContacts: { id: string; total_calls: number | null; is_aaa: boolean | null }[] = [];
  
  for (const chunk of idChunks) {
    const { data, error } = await supabase
      .from("contacts")
      .select("id, total_calls, is_aaa")
      .in("id", chunk);
    
    if (error) {
      console.error("Error fetching contacts chunk:", error);
      continue;
    }
    if (data) {
      allContacts.push(...data);
    }
  }
  
  if (allContacts.length === 0) {
    return { scheduled: 0, distribution: [] };
  }
  
  // Sort: AAA first, then by total_calls (new first)
  const sortedContacts = [...allContacts].sort((a, b) => {
    if (a.is_aaa && !b.is_aaa) return -1;
    if (!a.is_aaa && b.is_aaa) return 1;
    return (a.total_calls || 0) - (b.total_calls || 0);
  });
  
  // Track assignments
  const assignments: { id: string; date: string }[] = [];
  const distributionMap = new Map<string, number>();
  
  // Convert buckets to mutable map for tracking
  const bucketMap = new Map(buckets.map(b => [b.date, { ...b }]));
  
  for (const contact of sortedContacts) {
    const isNew = (contact.total_calls || 0) === 0;
    const bucketsArray = Array.from(bucketMap.values()).sort((a, b) => 
      a.date.localeCompare(b.date)
    );
    
    // Try to find a day within the window
    let bestDate = findBestDay(bucketsArray, isNew, opts);
    
    // If no day found, extend the window
    if (!bestDate) {
      // Add more days until we find space
      const lastDate = bucketsArray[bucketsArray.length - 1]?.date;
      const lastDateObj = lastDate ? new Date(lastDate) : new Date();
      const extraDays = getBusinessDaysList(
        new Date(lastDateObj.getTime() + 24 * 60 * 60 * 1000),
        10
      );
      
      for (const date of extraDays) {
        if (!bucketMap.has(date)) {
          bucketMap.set(date, {
            date,
            totalDue: 0,
            newDue: 0,
            followUpDue: 0,
          });
        }
      }
      
      // Try again with extended window
      const extendedBuckets = Array.from(bucketMap.values()).sort((a, b) => 
        a.date.localeCompare(b.date)
      );
      bestDate = findBestDay(extendedBuckets, isNew, opts);
    }
    
    if (bestDate) {
      assignments.push({ id: contact.id, date: bestDate });
      distributionMap.set(bestDate, (distributionMap.get(bestDate) || 0) + 1);
      
      // Update bucket counts
      const bucket = bucketMap.get(bestDate);
      if (bucket) {
        bucket.totalDue++;
        if (isNew) {
          bucket.newDue++;
        } else {
          bucket.followUpDue++;
        }
      }
    }
  }
  
  // Group assignments by date for efficient batch updates
  const assignmentsByDate = new Map<string, string[]>();
  for (const { id, date } of assignments) {
    const ids = assignmentsByDate.get(date) || [];
    ids.push(id);
    assignmentsByDate.set(date, ids);
  }
  
  // Batch update contacts by date (reduces number of queries)
  for (const [date, ids] of assignmentsByDate) {
    // Update in chunks to avoid URL length limits
    const updateChunks = chunkArray(ids, CHUNK_SIZE);
    for (const chunk of updateChunks) {
      const { error } = await supabase
        .from("contacts")
        .update({ next_call_date: date })
        .in("id", chunk);
      
      if (error) {
        console.error(`Error updating contacts for date ${date}:`, error);
      }
    }
  }
  
  // Build distribution summary
  const distribution = Array.from(distributionMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
  
  return {
    scheduled: assignments.length,
    distribution,
  };
}

/**
 * Get user's capacity settings (or defaults)
 */
export async function getCapacitySettings(userId: string): Promise<ScheduleOptions & { bloatThreshold: number }> {
  const supabase = createClient();
  
  const { data } = await supabase
    .from("capacity_settings")
    .select("*")
    .eq("user_id", userId)
    .single();
  
  return {
    targetPerDay: data?.target_per_day ?? DEFAULT_TARGET_PER_DAY,
    newQuotaPerDay: data?.new_quota_per_day ?? DEFAULT_NEW_QUOTA_PER_DAY,
    windowDays: data?.schedule_window_days ?? DEFAULT_SCHEDULE_WINDOW_DAYS,
    bloatThreshold: data?.bloat_threshold ?? DEFAULT_BLOAT_THRESHOLD,
  };
}

/**
 * Update user's capacity settings
 */
export async function updateCapacitySettings(
  userId: string,
  settings: Partial<{
    targetPerDay: number;
    newQuotaPerDay: number;
    windowDays: number;
    bloatThreshold: number;
  }>
): Promise<void> {
  const supabase = createClient();
  
  await supabase
    .from("capacity_settings")
    .upsert({
      user_id: userId,
      target_per_day: settings.targetPerDay,
      new_quota_per_day: settings.newQuotaPerDay,
      schedule_window_days: settings.windowDays,
      bloat_threshold: settings.bloatThreshold,
      updated_at: new Date().toISOString(),
    });
}

/**
 * Get counts of unscheduled and overdue contacts
 */
export async function getUnscheduledCounts(userId: string): Promise<{
  total: number;
  overdue: number;
}> {
  const supabase = createClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = formatDateForDB(today);
  
  // Get paused companies
  const { data: pausedCompanies } = await supabase
    .from("companies")
    .select("id, dialer_paused_until")
    .not("dialer_paused_until", "is", null);
  
  const pausedCompanyIds = new Set(
    (pausedCompanies || [])
      .filter(c => c.dialer_paused_until && new Date(c.dialer_paused_until) > today)
      .map(c => c.id)
  );
  
  // Get contacts with NULL next_call_date (unscheduled) - paginated to avoid 1000 limit
  const PAGE_SIZE = 1000;
  let unscheduledContacts: { id: string; company_id: string | null; phone: string | null; mobile: string | null; dialer_status: string | null; total_calls: number | null }[] = [];
  let unscheduledOffset = 0;
  while (true) {
    const { data: batch } = await supabase
      .from("contacts")
      .select("id, company_id, phone, mobile, dialer_status, total_calls")
      .eq("user_id", userId)
      .is("next_call_date", null)
      .order("id")
      .range(unscheduledOffset, unscheduledOffset + PAGE_SIZE - 1);
    if (!batch || batch.length === 0) break;
    unscheduledContacts.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    unscheduledOffset += PAGE_SIZE;
  }
  
  // Get contacts with overdue next_call_date - paginated
  let overdueContacts: typeof unscheduledContacts = [];
  let overdueOffset = 0;
  while (true) {
    const { data: batch } = await supabase
      .from("contacts")
      .select("id, company_id, phone, mobile, dialer_status, total_calls")
      .eq("user_id", userId)
      .lt("next_call_date", todayStr)
      .order("id")
      .range(overdueOffset, overdueOffset + PAGE_SIZE - 1);
    if (!batch || batch.length === 0) break;
    overdueContacts.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    overdueOffset += PAGE_SIZE;
  }
  
  let unscheduledTotal = 0;
  let overdueTotal = 0;

  for (const contact of unscheduledContacts) {
    if (isContactEligible(contact as Contact, pausedCompanyIds)) {
      unscheduledTotal++;
    }
  }
  
  for (const contact of overdueContacts) {
    if (isContactEligible(contact as Contact, pausedCompanyIds)) {
      overdueTotal++;
    }
  }
  
  return {
    total: unscheduledTotal,
    overdue: overdueTotal,
  };
}

/**
 * Get eligible unscheduled contacts for backfill (server-side selection)
 * Returns contacts in batches to avoid memory issues
 * Mirrors getUnscheduledCounts logic EXACTLY for consistency
 */
export async function getEligibleUnscheduledContacts(
  userId: string,
  options: {
    includeOverdue?: boolean;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ id: string; total_calls: number | null; is_aaa: boolean | null }[]> {
  const supabase = createClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = formatDateForDB(today);
  
  const { includeOverdue = true, limit = 500, offset = 0 } = options;
  
  // Get paused companies - EXACT same logic as getUnscheduledCounts
  const { data: pausedCompanies } = await supabase
    .from("companies")
    .select("id, dialer_paused_until")
    .not("dialer_paused_until", "is", null);
  
  const pausedCompanyIds = new Set(
    (pausedCompanies || [])
      .filter(c => c.dialer_paused_until && new Date(c.dialer_paused_until) > today)
      .map(c => c.id)
  );
  
  // Query unscheduled contacts - paginated to avoid 1000 limit, same logic as getUnscheduledCounts
  const PAGE_SIZE = 1000;
  let unscheduledContacts: { id: string; company_id: string | null; phone: string | null; mobile: string | null; dialer_status: string | null; total_calls: number | null; is_aaa: boolean | null; next_call_date: string | null }[] = [];
  let unscheduledOffset = 0;
  while (true) {
    const { data: batch } = await supabase
      .from("contacts")
      .select("id, company_id, phone, mobile, dialer_status, total_calls, is_aaa, next_call_date")
      .eq("user_id", userId)
      .is("next_call_date", null)
      .order("id")
      .range(unscheduledOffset, unscheduledOffset + PAGE_SIZE - 1);
    if (!batch || batch.length === 0) break;
    unscheduledContacts.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    unscheduledOffset += PAGE_SIZE;
  }
  
  // Also get overdue contacts if requested - paginated
  let overdueContacts: typeof unscheduledContacts = [];
  if (includeOverdue) {
    let overdueOffset = 0;
    while (true) {
      const { data: batch } = await supabase
        .from("contacts")
        .select("id, company_id, phone, mobile, dialer_status, total_calls, is_aaa, next_call_date")
        .eq("user_id", userId)
        .lt("next_call_date", todayStr)
        .order("id")
        .range(overdueOffset, overdueOffset + PAGE_SIZE - 1);
      if (!batch || batch.length === 0) break;
      overdueContacts.push(...batch);
      if (batch.length < PAGE_SIZE) break;
      overdueOffset += PAGE_SIZE;
    }
  }
  
  // Combine and dedupe
  const allContacts = [...unscheduledContacts, ...overdueContacts];
  const seenIds = new Set<string>();
  const uniqueContacts = allContacts.filter(c => {
    if (seenIds.has(c.id)) return false;
    seenIds.add(c.id);
    return true;
  });
  
  // Filter using isContactEligible - EXACT same logic as getUnscheduledCounts
  const filtered = uniqueContacts.filter(c => {
    return isContactEligible(c as Contact, pausedCompanyIds);
  });
  
  // Sort: AAA first, then by total_calls (new first)
  filtered.sort((a, b) => {
    if (a.is_aaa && !b.is_aaa) return -1;
    if (!a.is_aaa && b.is_aaa) return 1;
    return (a.total_calls || 0) - (b.total_calls || 0);
  });
  
  // Apply pagination after filtering
  const paginated = filtered.slice(offset, offset + limit);
  
  return paginated.map(c => ({
    id: c.id,
    total_calls: c.total_calls,
    is_aaa: c.is_aaa,
  }));
}

/**
 * Get count of unreachable contacts due today (6+ calls, no connection)
 */
export async function getUnreachableTodayCount(
  userId: string,
  dueToday: number
): Promise<{ count: number; percentage: number }> {
  const supabase = createClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = formatDateForDB(today);
  
  // Get contacts due today with 6+ total_calls
  const { data: highAttemptContacts } = await supabase
    .from("contacts")
    .select("id, total_calls")
    .eq("user_id", userId)
    .or(`next_call_date.is.null,next_call_date.lte.${todayStr}`)
    .gte("total_calls", 6)
    .or("phone.not.is.null,mobile.not.is.null")
    .or("dialer_status.is.null,dialer_status.eq.active");
  
  if (!highAttemptContacts || highAttemptContacts.length === 0) {
    return { count: 0, percentage: 0 };
  }
  
  const contactIds = highAttemptContacts.map(c => c.id);
  
  // Check which of these have never connected (no "connected" outcome)
  // Get latest 6 calls for each contact and check for connected
  const { data: calls } = await supabase
    .from("calls")
    .select("contact_id, outcome")
    .in("contact_id", contactIds.slice(0, 100)) // Limit for performance
    .order("started_at", { ascending: false });
  
  // Group calls by contact and check for connected
  const contactsWithConnected = new Set<string>();
  const callsByContact = new Map<string, string[]>();
  
  for (const call of (calls || [])) {
    const outcomes = callsByContact.get(call.contact_id) || [];
    if (outcomes.length < 6) {
      outcomes.push(call.outcome);
      callsByContact.set(call.contact_id, outcomes);
    }
    if (call.outcome === "connected") {
      contactsWithConnected.add(call.contact_id);
    }
  }
  
  // Count contacts with 6+ attempts and no connected
  let unreachableCount = 0;
  for (const contact of highAttemptContacts) {
    if (!contactsWithConnected.has(contact.id)) {
      unreachableCount++;
    }
  }
  
  const percentage = dueToday > 0 ? Math.round((unreachableCount / dueToday) * 100) : 0;
  
  return {
    count: unreachableCount,
    percentage,
  };
}

export interface BackfillPreview {
  eligible: number;
  unscheduled: number;
  overdue: number;
  alreadyScheduled: number;
  estimatedDays: number;
}

/**
 * Get a preview of what backfill would do (without making changes)
 */
export async function getBackfillPreview(userId: string): Promise<BackfillPreview> {
  const supabase = createClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = formatDateForDB(today);
  
  // Get paused companies
  const { data: pausedCompanies } = await supabase
    .from("companies")
    .select("id, dialer_paused_until")
    .not("dialer_paused_until", "is", null);
  
  const pausedCompanyIds = new Set(
    (pausedCompanies || [])
      .filter(c => c.dialer_paused_until && new Date(c.dialer_paused_until) > today)
      .map(c => c.id)
  );
  
  // Get all contacts
  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, next_call_date, total_calls, company_id, phone, mobile, dialer_status")
    .eq("user_id", userId);
  
  let unscheduled = 0;
  let overdue = 0;
  let alreadyScheduled = 0;
  let eligible = 0;
  
  for (const contact of (contacts || [])) {
    if (!isContactEligible(contact as Contact, pausedCompanyIds)) continue;
    
    eligible++;
    
    if (!contact.next_call_date) {
      unscheduled++;
    } else if (contact.next_call_date < todayStr) {
      overdue++;
    } else if (contact.next_call_date > todayStr) {
      alreadyScheduled++;
    }
  }
  
  const toSchedule = unscheduled + overdue;
  const estimatedDays = Math.ceil(toSchedule / DEFAULT_TARGET_PER_DAY);
  
  return {
    eligible,
    unscheduled,
    overdue,
    alreadyScheduled,
    estimatedDays,
  };
}
