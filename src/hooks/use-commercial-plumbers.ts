"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Contact } from "@/types/database";

// Contacts tagged with this are the "Commercial Plumbers" dialer segment.
export const COMMERCIAL_PLUMBERS_TAG = "commercial_plumbers";

/**
 * The "Commercial Plumbers" dialer category — every contact tagged
 * `commercial_plumbers` (set when the list is imported). Pool-agnostic like the
 * other priority queues, so all of them surface; the dialer's timezone / company-
 * size / require-phone filters then segment within it. Closed (won/lost) deals
 * are excluded. Paginated past the 1000-row cap.
 */
export function useCommercialPlumbers() {
  const supabase = createClient();

  return useQuery<Contact[]>({
    queryKey: ["commercial-plumbers"],
    queryFn: async () => {
      const all: Contact[] = [];
      let from = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data, error } = await supabase
          .from("contacts")
          .select("*")
          .contains("tags", [COMMERCIAL_PLUMBERS_TAG])
          .not("stage", "in", "(won,lost)")
          .range(from, from + 999);
        if (error) throw error;
        const batch = (data as Contact[]) ?? [];
        all.push(...batch);
        if (batch.length < 1000) break;
        from += 1000;
      }
      return all;
    },
  });
}
