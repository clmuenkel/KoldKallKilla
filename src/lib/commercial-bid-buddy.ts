export const COMMERCIAL_BID_BUDDY_TAG = "commercial_bid_buddy";

export function isBidBuddyCallable(contact: {
  stage: string | null;
  status: string | null;
  dialer_status: string | null;
  total_calls: number | null;
  company_id: string | null;
  tags?: string[] | null;
}, pausedCompanyIds: ReadonlySet<string>): boolean {
  return !["won", "lost"].includes(contact.stage || "")
    && !contact.tags?.includes("bidbuddy_identity_review")
    && (!contact.status || contact.status === "active")
    && (!contact.dialer_status || contact.dialer_status === "active")
    && (contact.total_calls || 0) < 10
    && (!contact.company_id || !pausedCompanyIds.has(contact.company_id));
}

type RankedContact = { id: string; tags: string[] | null; company_name: string | null };

export function compareBidBuddyContacts(a: RankedContact, b: RankedContact): number {
  const rank = (c: RankedContact) => c.tags?.includes("bidbuddy_commercial_plumbing") ? 0
    : c.tags?.includes("bidbuddy_other_commercial_trade") ? 1 : 2;
  return rank(a) - rank(b)
    || (a.company_name || "").localeCompare(b.company_name || "")
    || a.id.localeCompare(b.id);
}
