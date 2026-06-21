"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuthId } from "@/hooks/use-auth";
import type { Contact } from "@/types/database";

export interface BusinessSettings {
  user_id: string;
  tier_good_annual: number | null;
  tier_better_annual: number | null;
  tier_best_annual: number | null;
  monthly_close_goal: number;
}

const DEFAULT_SETTINGS: Omit<BusinessSettings, "user_id"> = {
  tier_good_annual: null,
  tier_better_annual: null,
  tier_best_annual: null,
  monthly_close_goal: 5,
};

/** Per-user pricing tiers + monthly close goal. */
export function useBusinessSettings() {
  const supabase = createClient();
  const userId = useAuthId();
  return useQuery<BusinessSettings>({
    queryKey: ["business-settings", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_settings")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return (data as BusinessSettings) ?? { user_id: userId!, ...DEFAULT_SETTINGS };
    },
  });
}

export function useUpdateBusinessSettings() {
  const supabase = createClient();
  const userId = useAuthId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Partial<Omit<BusinessSettings, "user_id">>) => {
      const { data, error } = await supabase
        .from("business_settings")
        .upsert({ user_id: userId!, ...updates, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
        .select()
        .single();
      if (error) throw error;
      return data as BusinessSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-settings"] });
      queryClient.invalidateQueries({ queryKey: ["client-metrics"] });
    },
  });
}

/** Annual value a client pays us: exact override, else the tier price. */
export function effectiveClientValue(c: Contact, s?: BusinessSettings | null): number {
  if (c.deal_value_annual != null) return Number(c.deal_value_annual);
  if (!s) return 0;
  switch (c.plan_tier) {
    case "good": return Number(s.tier_good_annual ?? 0);
    case "better": return Number(s.tier_better_annual ?? 0);
    case "best": return Number(s.tier_best_annual ?? 0);
    default: return 0;
  }
}

export interface ClientMetrics {
  activeClients: number;
  arr: number;
  churnedThisMonth: number;
  wonThisMonth: number;     // became_client_at in current month
  netAddsThisMonth: number; // won - churned this month
  churnRatePct: number;     // churned this month / active at start of month
}

/**
 * Live client metrics from the contacts that are clients (stage='won').
 * Active = won AND no churned_at. ARR = sum of effective annual values of active.
 */
export function useClientMetrics() {
  const supabase = createClient();
  const userId = useAuthId();
  const settings = useBusinessSettings();

  return useQuery<ClientMetrics>({
    queryKey: ["client-metrics", userId, settings.data],
    enabled: !!userId && settings.isSuccess,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("plan_tier, deal_value_annual, became_client_at, churned_at, stage")
        .eq("user_id", userId!)
        .eq("stage", "won");
      if (error) throw error;
      const clients = (data as Contact[]) ?? [];
      const s = settings.data;

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const inThisMonth = (d?: string | null) => {
        if (!d) return false;
        const dt = new Date(d);
        return dt >= monthStart && dt <= now;
      };

      const active = clients.filter((c) => !c.churned_at);
      const arr = active.reduce((sum, c) => sum + effectiveClientValue(c, s), 0);
      const churnedThisMonth = clients.filter((c) => inThisMonth(c.churned_at)).length;
      const wonThisMonth = clients.filter((c) => inThisMonth(c.became_client_at)).length;
      // Active at start of month = active now + churned this month - won this month.
      const activeAtStart = active.length + churnedThisMonth - wonThisMonth;

      return {
        activeClients: active.length,
        arr,
        churnedThisMonth,
        wonThisMonth,
        netAddsThisMonth: wonThisMonth - churnedThisMonth,
        churnRatePct: activeAtStart > 0 ? Math.round((churnedThisMonth / activeAtStart) * 1000) / 10 : 0,
      };
    },
  });
}
