"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuthId } from "@/hooks/use-auth";
import { COMMERCIAL_BID_BUDDY_TAG } from "@/lib/commercial-bid-buddy";
import type { Contact } from "@/types/database";

export function useCommercialBidBuddy() {
  const supabase = createClient();
  const userId = useAuthId();
  return useQuery<Contact[]>({
    queryKey: ["contacts", "commercial-bid-buddy", userId],
    enabled: !!userId,
    queryFn: async () => {
      const all: Contact[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase.from("contacts").select("*")
          .eq("user_id", userId!)
          .contains("tags", [COMMERCIAL_BID_BUDDY_TAG])
          .order("id")
          .range(from, from + 999);
        if (error) throw error;
        const batch = (data as Contact[]) ?? [];
        all.push(...batch);
        if (batch.length < 1000) return all;
      }
    },
  });
}

// Fetch independently of the general company picker, which is limited to one page.
export function useBidBuddyCompanyPauses() {
  const supabase = createClient();
  const userId = useAuthId();
  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return useQuery<{ id: string }[]>({
    queryKey: ["companies", "bidbuddy-pauses", userId, date],
    enabled: !!userId,
    queryFn: async () => {
      const all: { id: string }[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase.from("companies").select("id")
          .eq("user_id", userId!)
          .gt("dialer_paused_until", date)
          .order("id")
          .range(from, from + 999);
        if (error) throw error;
        all.push(...(data ?? []));
        if ((data?.length ?? 0) < 1000) return all;
      }
    },
  });
}
