/**
 * Multi-token search for Supabase/PostgREST queries.
 *
 * The naive approach — `col.ilike.%"John Smith"%` against each column — fails for
 * full names, because no single column contains "John Smith" (first_name is
 * "John", last_name is "Smith"). So typing a full name returns nothing while a
 * single word works. The fix: split the query into words and require EVERY word
 * to match SOME column. Chaining `.or()` ANDs the groups in PostgREST, so:
 *   "John Smith" -> (any col ~ John) AND (any col ~ Smith)
 */

/** Split a search box value into clean tokens safe to inline in a PostgREST or() filter. */
export function searchTokens(search: string | null | undefined): string[] {
  return (search || "")
    .split(/\s+/)
    // Strip characters that would break the or() grammar or the ilike pattern.
    .map((t) => t.replace(/[%,()*]/g, "").trim())
    .filter(Boolean);
}

/**
 * Apply a "every word must match some column" search to a Supabase query builder.
 * Returns the query unchanged when there are no usable tokens.
 */
export function applySearch(query: any, search: string | null | undefined, columns: string[]): any {
  const tokens = searchTokens(search);
  let q = query;
  for (const token of tokens) {
    q = q.or(columns.map((c) => `${c}.ilike.%${token}%`).join(","));
  }
  return q;
}

// Shared column sets so all search sites stay consistent.
export const CONTACT_SEARCH_COLUMNS = [
  "first_name",
  "last_name",
  "title",
  "company_name",
  "email",
  "phone",
  "mobile",
];

export const COMPANY_SEARCH_COLUMNS = ["name", "domain", "industry", "city", "state", "country"];
