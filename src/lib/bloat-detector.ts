/**
 * Bloat detection and smart removal/throttle suggestions
 * Detects when due contacts exceed capacity and suggests intelligent fixes
 */

import { createClient } from "@/lib/supabase/client";
import { 
  getDueToday, 
  getCapacitySettings,
  getBusinessDaysList,
  DEFAULT_TARGET_PER_DAY,
  DEFAULT_BLOAT_THRESHOLD,
} from "@/lib/capacity-scheduler";
import { formatDateForDB, addBusinessDays } from "@/lib/utils";

export interface BloatStatus {
  dueToday: number;
  target: number;
  overage: number;
  isBloated: boolean;
  bloatThreshold: number;
  newCount: number;
  followUpCount: number;
  overdueCount: number;
}

export type RemovalTier = 0 | 1 | 2;

export type SuggestedAction = 
  | "pause_12mo" 
  | "pause_6mo" 
  | "throttle_10d" 
  | "throttle_14d";

export interface RemovalCandidate {
  contactId: string;
  contactName: string;
  companyName: string | null;
  tier: RemovalTier;
  reason: string;
  suggestedAction: SuggestedAction;
  unreachableScore?: number;
  totalCalls: number;
  lastOutcome: string | null;
  lastDisposition: string | null;
  lastContactedAt: string | null;
  isAaa: boolean;
}

// Tier descriptions for UI
export const TIER_DESCRIPTIONS: Record<RemovalTier, { label: string; description: string }> = {
  0: {
    label: "Do Not Contact",
    description: "Contacts marked as DNC or with repeated wrong numbers",
  },
  1: {
    label: "Not Interested",
    description: "Contacts who explicitly declined",
  },
  2: {
    label: "Unreachable",
    description: "High call attempts with no successful connection",
  },
};

// Action descriptions for UI
export const ACTION_DESCRIPTIONS: Record<SuggestedAction, { label: string; description: string }> = {
  pause_12mo: {
    label: "Pause 12 months",
    description: "Remove from dialer pool for 1 year",
  },
  pause_6mo: {
    label: "Pause 6 months",
    description: "Remove from dialer pool for 6 months",
  },
  throttle_10d: {
    label: "Throttle to 10 days",
    description: "Set calling cadence to every 10 business days",
  },
  throttle_14d: {
    label: "Throttle to 14 days",
    description: "Set calling cadence to every 14 business days",
  },
};

/**
 * Detect if the user's dialer queue is bloated
 */
export async function detectBloat(userId: string): Promise<BloatStatus> {
  const settings = await getCapacitySettings(userId);
  const dueStats = await getDueToday(userId);
  
  return {
    dueToday: dueStats.total,
    target: settings.targetPerDay,
    overage: Math.max(0, dueStats.total - settings.targetPerDay),
    isBloated: dueStats.total >= settings.bloatThreshold,
    bloatThreshold: settings.bloatThreshold,
    newCount: dueStats.new,
    followUpCount: dueStats.followUp,
    overdueCount: dueStats.overdue,
  };
}

/**
 * Compute unreachable score for a contact based on their call history
 * Higher score = more unreachable
 */
export async function computeUnreachableScore(contactId: string): Promise<number> {
  const supabase = createClient();
  
  // Get last 6 calls for this contact
  const { data: calls } = await supabase
    .from("calls")
    .select("outcome, disposition")
    .eq("contact_id", contactId)
    .order("started_at", { ascending: false })
    .limit(6);
  
  if (!calls || calls.length === 0) return 0;
  
  let score = 0;
  let hasConnected = false;
  
  for (const call of calls) {
    switch (call.outcome) {
      case "no_answer":
        score += 10;
        break;
      case "voicemail":
        score += 8;
        break;
      case "ai_screener":
        score += 6;
        break;
      case "connected":
        hasConnected = true;
        break;
      case "wrong_number":
        score += 5;
        break;
      case "gatekeeper":
        score += 3;
        break;
    }
  }
  
  // Heavy penalty reduction if they've ever connected
  if (hasConnected) {
    score -= 40;
  }
  
  return Math.max(0, score);
}

/**
 * Compute unreachable scores for multiple contacts in batch
 */
async function computeUnreachableScoresBatch(
  contactIds: string[]
): Promise<Map<string, number>> {
  const supabase = createClient();
  const scores = new Map<string, number>();
  
  // Initialize all scores to 0
  for (const id of contactIds) {
    scores.set(id, 0);
  }
  
  if (contactIds.length === 0) return scores;
  
  // Get calls for all contacts (last 6 per contact via window function would be ideal,
  // but we'll fetch and process in JS for simplicity)
  const { data: calls } = await supabase
    .from("calls")
    .select("contact_id, outcome, disposition, started_at")
    .in("contact_id", contactIds)
    .order("started_at", { ascending: false });
  
  if (!calls) return scores;
  
  // Group by contact and take last 6
  const callsByContact = new Map<string, typeof calls>();
  for (const call of calls) {
    const existing = callsByContact.get(call.contact_id) || [];
    if (existing.length < 6) {
      existing.push(call);
      callsByContact.set(call.contact_id, existing);
    }
  }
  
  // Compute scores
  for (const [contactId, contactCalls] of callsByContact) {
    let score = 0;
    let hasConnected = false;
    
    for (const call of contactCalls) {
      switch (call.outcome) {
        case "no_answer":
          score += 10;
          break;
        case "voicemail":
          score += 8;
          break;
        case "ai_screener":
          score += 6;
          break;
        case "connected":
          hasConnected = true;
          break;
        case "wrong_number":
          score += 5;
          break;
        case "gatekeeper":
          score += 3;
          break;
      }
    }
    
    if (hasConnected) {
      score -= 40;
    }
    
    scores.set(contactId, Math.max(0, score));
  }
  
  return scores;
}

/**
 * Get removal candidates organized by tier
 * Excludes AAA contacts by default
 */
export async function getRemovalCandidates(
  userId: string,
  options: {
    limit?: number;
    excludeAaa?: boolean;
  } = {}
): Promise<{
  tier0: RemovalCandidate[];
  tier1: RemovalCandidate[];
  tier2: RemovalCandidate[];
  total: number;
}> {
  const supabase = createClient();
  const { limit = 100, excludeAaa = true } = options;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = formatDateForDB(today);
  
  // Get due contacts with their last call info
  // We need contacts that are due today or earlier
  let query = supabase
    .from("contacts")
    .select(`
      id,
      first_name,
      last_name,
      company_name,
      total_calls,
      last_contacted_at,
      is_aaa,
      phone,
      mobile,
      dialer_status
    `)
    .eq("user_id", userId)
    .or(`next_call_date.is.null,next_call_date.lte.${todayStr}`)
    .gte("total_calls", 1); // Only contacts we've actually called
  
  if (excludeAaa) {
    query = query.eq("is_aaa", false);
  }
  
  const { data: contacts } = await query;
  
  if (!contacts || contacts.length === 0) {
    return { tier0: [], tier1: [], tier2: [], total: 0 };
  }
  
  // Filter eligible contacts
  const eligibleContacts = contacts.filter(c => 
    (c.phone || c.mobile) &&
    c.dialer_status !== "paused" &&
    c.dialer_status !== "exhausted" &&
    c.dialer_status !== "converted" &&
    (c.total_calls || 0) < 10
  );
  
  const contactIds = eligibleContacts.map(c => c.id);
  
  // Get last call for each contact
  const { data: lastCalls } = await supabase
    .from("calls")
    .select("contact_id, outcome, disposition, started_at")
    .in("contact_id", contactIds)
    .order("started_at", { ascending: false });
  
  // Build map of last call per contact
  const lastCallMap = new Map<string, { outcome: string; disposition: string | null }>();
  for (const call of (lastCalls || [])) {
    if (!lastCallMap.has(call.contact_id)) {
      lastCallMap.set(call.contact_id, {
        outcome: call.outcome,
        disposition: call.disposition,
      });
    }
  }
  
  // Categorize into tiers
  const tier0: RemovalCandidate[] = [];
  const tier1: RemovalCandidate[] = [];
  const tier2Candidates: typeof eligibleContacts = [];
  
  for (const contact of eligibleContacts) {
    const lastCall = lastCallMap.get(contact.id);
    const contactName = `${contact.first_name} ${contact.last_name || ""}`.trim();
    
    // Check for Tier 0 (DNC or wrong number)
    if (lastCall?.disposition === "do_not_contact") {
      tier0.push({
        contactId: contact.id,
        contactName,
        companyName: contact.company_name,
        tier: 0,
        reason: "Marked as Do Not Contact",
        suggestedAction: "pause_12mo",
        totalCalls: contact.total_calls || 0,
        lastOutcome: lastCall.outcome,
        lastDisposition: lastCall.disposition,
        lastContactedAt: contact.last_contacted_at,
        isAaa: contact.is_aaa || false,
      });
      continue;
    }
    
    if (lastCall?.outcome === "wrong_number") {
      tier0.push({
        contactId: contact.id,
        contactName,
        companyName: contact.company_name,
        tier: 0,
        reason: "Wrong number",
        suggestedAction: "pause_12mo",
        totalCalls: contact.total_calls || 0,
        lastOutcome: lastCall.outcome,
        lastDisposition: lastCall.disposition,
        lastContactedAt: contact.last_contacted_at,
        isAaa: contact.is_aaa || false,
      });
      continue;
    }
    
    // Check for Tier 1 (Not interested)
    if (lastCall?.disposition && [
      "not_interested_fit",
      "not_interested_solution",
      "not_interested_budget",
    ].includes(lastCall.disposition)) {
      tier1.push({
        contactId: contact.id,
        contactName,
        companyName: contact.company_name,
        tier: 1,
        reason: getNotInterestedReason(lastCall.disposition),
        suggestedAction: "pause_6mo",
        totalCalls: contact.total_calls || 0,
        lastOutcome: lastCall.outcome,
        lastDisposition: lastCall.disposition,
        lastContactedAt: contact.last_contacted_at,
        isAaa: contact.is_aaa || false,
      });
      continue;
    }
    
    // Candidates for Tier 2 (need score calculation)
    if ((contact.total_calls || 0) >= 6) {
      tier2Candidates.push(contact);
    }
  }
  
  // Compute unreachable scores for Tier 2 candidates
  const tier2ContactIds = tier2Candidates.map(c => c.id);
  const scores = await computeUnreachableScoresBatch(tier2ContactIds);
  
  const tier2: RemovalCandidate[] = [];
  for (const contact of tier2Candidates) {
    const score = scores.get(contact.id) || 0;
    if (score < 30) continue; // Not unreachable enough
    
    const lastCall = lastCallMap.get(contact.id);
    const contactName = `${contact.first_name} ${contact.last_name || ""}`.trim();
    
    tier2.push({
      contactId: contact.id,
      contactName,
      companyName: contact.company_name,
      tier: 2,
      reason: `${contact.total_calls} attempts, no connection`,
      suggestedAction: score >= 60 ? "throttle_14d" : "throttle_10d",
      unreachableScore: score,
      totalCalls: contact.total_calls || 0,
      lastOutcome: lastCall?.outcome || null,
      lastDisposition: lastCall?.disposition || null,
      lastContactedAt: contact.last_contacted_at,
      isAaa: contact.is_aaa || false,
    });
  }
  
  // Sort each tier by total calls (descending) and limit
  const sortByCallsDesc = (a: RemovalCandidate, b: RemovalCandidate) => 
    b.totalCalls - a.totalCalls;
  
  tier0.sort(sortByCallsDesc);
  tier1.sort(sortByCallsDesc);
  tier2.sort((a, b) => (b.unreachableScore || 0) - (a.unreachableScore || 0));
  
  return {
    tier0: tier0.slice(0, limit),
    tier1: tier1.slice(0, limit),
    tier2: tier2.slice(0, limit),
    total: tier0.length + tier1.length + tier2.length,
  };
}

/**
 * Get human-readable reason for not interested disposition
 */
function getNotInterestedReason(disposition: string): string {
  switch (disposition) {
    case "not_interested_fit":
      return "Not a fit for their needs";
    case "not_interested_solution":
      return "Not interested in solution";
    case "not_interested_budget":
      return "Budget constraints";
    default:
      return "Not interested";
  }
}

/**
 * Apply bloat fixes to candidates
 */
export async function applyBloatFix(
  userId: string,
  candidates: { contactId: string; action: SuggestedAction }[]
): Promise<{ applied: number; failed: number }> {
  const supabase = createClient();
  let applied = 0;
  let failed = 0;
  
  for (const { contactId, action } of candidates) {
    try {
      if (action === "pause_12mo" || action === "pause_6mo") {
        // Pause the contact
        const months = action === "pause_12mo" ? 12 : 6;
        const pauseUntil = new Date();
        pauseUntil.setMonth(pauseUntil.getMonth() + months);
        
        await supabase
          .from("contacts")
          .update({
            dialer_status: "paused",
            dialer_paused_until: formatDateForDB(pauseUntil),
            dialer_pause_reason_code: action === "pause_12mo" ? "bloat_fix_dnc" : "bloat_fix_not_interested",
            dialer_paused_at: new Date().toISOString(),
          })
          .eq("id", contactId);
        
        // Log event
        const { data: contact } = await supabase
          .from("contacts")
          .select("first_name, last_name")
          .eq("id", contactId)
          .single();
        
        await supabase.from("dialer_pool_events").insert({
          user_id: userId,
          entity_type: "contact",
          contact_id: contactId,
          entity_name: `${contact?.first_name || ""} ${contact?.last_name || ""}`.trim(),
          action: "paused",
          paused_until: formatDateForDB(pauseUntil),
          duration_months: months,
          reason_code: action === "pause_12mo" ? "bloat_fix_dnc" : "bloat_fix_not_interested",
        });
        
        applied++;
      } else if (action === "throttle_10d" || action === "throttle_14d") {
        // Throttle cadence (permanent change)
        const cadenceDays = action === "throttle_10d" ? 10 : 14;
        const nextCallDate = addBusinessDays(new Date(), cadenceDays);
        
        await supabase
          .from("contacts")
          .update({
            cadence_days: cadenceDays,
            next_call_date: formatDateForDB(nextCallDate),
          })
          .eq("id", contactId);
        
        applied++;
      }
    } catch (error) {
      console.error(`Failed to apply fix for contact ${contactId}:`, error);
      failed++;
    }
  }
  
  return { applied, failed };
}

/**
 * Auto-fix bloat by applying suggested actions up to overage count
 */
export async function autoFixBloat(
  userId: string,
  overage: number
): Promise<{ applied: number; tier0: number; tier1: number; tier2: number }> {
  const candidates = await getRemovalCandidates(userId, { excludeAaa: true });
  
  const toFix: { contactId: string; action: SuggestedAction }[] = [];
  let remaining = overage;
  
  // Apply Tier 0 first (most confident)
  for (const candidate of candidates.tier0) {
    if (remaining <= 0) break;
    toFix.push({ contactId: candidate.contactId, action: candidate.suggestedAction });
    remaining--;
  }
  
  // Then Tier 1
  for (const candidate of candidates.tier1) {
    if (remaining <= 0) break;
    toFix.push({ contactId: candidate.contactId, action: candidate.suggestedAction });
    remaining--;
  }
  
  // Then Tier 2
  for (const candidate of candidates.tier2) {
    if (remaining <= 0) break;
    toFix.push({ contactId: candidate.contactId, action: candidate.suggestedAction });
    remaining--;
  }
  
  const result = await applyBloatFix(userId, toFix);
  
  return {
    applied: result.applied,
    tier0: toFix.filter(f => 
      candidates.tier0.some(c => c.contactId === f.contactId)
    ).length,
    tier1: toFix.filter(f => 
      candidates.tier1.some(c => c.contactId === f.contactId)
    ).length,
    tier2: toFix.filter(f => 
      candidates.tier2.some(c => c.contactId === f.contactId)
    ).length,
  };
}
