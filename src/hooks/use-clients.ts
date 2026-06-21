"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuthId } from "@/hooks/use-auth";
import type { Contact } from "@/types/database";

export type Tier = "good" | "better" | "best";

export interface BusinessSettings {
  user_id: string;
  tier_good_deposit: number | null;
  tier_good_monthly: number | null;
  tier_good_buyout: number | null;
  tier_better_deposit: number | null;
  tier_better_monthly: number | null;
  tier_better_buyout: number | null;
  tier_best_deposit: number | null;
  tier_best_monthly: number | null;
  tier_best_buyout: number | null;
  monthly_close_goal: number;
}

const DEFAULT_SETTINGS: Omit<BusinessSettings, "user_id"> = {
  tier_good_deposit: null, tier_good_monthly: null, tier_good_buyout: null,
  tier_better_deposit: null, tier_better_monthly: null, tier_better_buyout: null,
  tier_best_deposit: null, tier_best_monthly: null, tier_best_buyout: null,
  monthly_close_goal: 5,
};

/** Monthly recurring price for a tier from settings. */
export function tierMonthly(tier: string | null | undefined, s?: BusinessSettings | null): number {
  if (!s || !tier) return 0;
  return Number((s as any)[`tier_${tier}_monthly`] ?? 0);
}
export function tierDeposit(tier: string | null | undefined, s?: BusinessSettings | null): number {
  if (!s || !tier) return 0;
  return Number((s as any)[`tier_${tier}_deposit`] ?? 0);
}
export function tierBuyout(tier: string | null | undefined, s?: BusinessSettings | null): number {
  if (!s || !tier) return 0;
  return Number((s as any)[`tier_${tier}_buyout`] ?? 0);
}

export interface MonthlyMilestone {
  month: string; // YYYY-MM-DD (first of month)
  target_active_clients: number | null;
  target_closes: number | null;
  target_arr: number | null;
}

/** The 30-month ramp (target clients / closes / ARR per month). */
export function useMonthlyMilestones() {
  const supabase = createClient();
  const userId = useAuthId();
  return useQuery<MonthlyMilestone[]>({
    queryKey: ["monthly-milestones", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_milestones")
        .select("month, target_active_clients, target_closes, target_arr")
        .eq("user_id", userId!)
        .order("month", { ascending: true });
      if (error) throw error;
      return (data as MonthlyMilestone[]) ?? [];
    },
  });
}

/** The milestone row for the current calendar month, if any. */
export function useCurrentMilestone() {
  const { data, ...rest } = useMonthlyMilestones();
  const now = new Date();
  const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const current = (data ?? []).find((m) => m.month.startsWith(key)) ?? null;
  return { ...rest, data: current };
}

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

/** Monthly recurring for a client. Priority: custom monthly override →
 *  legacy annual override / 12 → the plan tier's monthly. */
export function effectiveClientMonthly(c: Contact, s?: BusinessSettings | null): number {
  if (c.deal_value_monthly != null) return Number(c.deal_value_monthly);
  if (c.deal_value_annual != null) return Number(c.deal_value_annual) / 12;
  return tierMonthly(c.plan_tier, s);
}
/** Annual RECURRING value (= 12 * effective monthly). Deposit is one-time, not ARR. */
export function effectiveClientValue(c: Contact, s?: BusinessSettings | null): number {
  return effectiveClientMonthly(c, s) * 12;
}
/** One-time deposit this client paid (custom override → tier deposit). */
export function effectiveDeposit(c: Contact, s?: BusinessSettings | null): number {
  if (c.deposit_paid != null) return Number(c.deposit_paid);
  return tierDeposit(c.plan_tier, s);
}

export interface ClientMetrics {
  activeClients: number;
  arr: number;
  mrr: number;
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
      const mrr = active.reduce((sum, c) => sum + effectiveClientMonthly(c, s), 0);
      const churnedThisMonth = clients.filter((c) => inThisMonth(c.churned_at)).length;
      const wonThisMonth = clients.filter((c) => inThisMonth(c.became_client_at)).length;
      // Active at start of month = active now + churned this month - won this month.
      const activeAtStart = active.length + churnedThisMonth - wonThisMonth;

      return {
        activeClients: active.length,
        arr,
        mrr,
        churnedThisMonth,
        wonThisMonth,
        netAddsThisMonth: wonThisMonth - churnedThisMonth,
        churnRatePct: activeAtStart > 0 ? Math.round((churnedThisMonth / activeAtStart) * 1000) / 10 : 0,
      };
    },
  });
}
