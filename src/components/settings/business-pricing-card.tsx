"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CircleDollarSign } from "lucide-react";
import { useBusinessSettings, useUpdateBusinessSettings } from "@/hooks/use-clients";
import { toast } from "sonner";

type Row = { deposit: string; monthly: string; buyout: string };
const blank: Row = { deposit: "", monthly: "", buyout: "" };
const TIERS: { key: "good" | "better" | "best"; label: string }[] = [
  { key: "good", label: "Good" },
  { key: "better", label: "Better" },
  { key: "best", label: "Best" },
];

/** Settings: per-tier pricing (deposit + monthly + buyout) + monthly close goal. */
export function BusinessPricingCard() {
  const { data, isLoading } = useBusinessSettings();
  const update = useUpdateBusinessSettings();

  const [rows, setRows] = useState<Record<string, Row>>({ good: blank, better: blank, best: blank });
  const [goal, setGoal] = useState("5");

  useEffect(() => {
    if (data) {
      const r = (k: string): Row => ({
        deposit: (data as any)[`tier_${k}_deposit`] != null ? String((data as any)[`tier_${k}_deposit`]) : "",
        monthly: (data as any)[`tier_${k}_monthly`] != null ? String((data as any)[`tier_${k}_monthly`]) : "",
        buyout: (data as any)[`tier_${k}_buyout`] != null ? String((data as any)[`tier_${k}_buyout`]) : "",
      });
      setRows({ good: r("good"), better: r("better"), best: r("best") });
      setGoal(String(data.monthly_close_goal ?? 5));
    }
  }, [data]);

  const set = (tier: string, field: keyof Row, v: string) =>
    setRows((prev) => ({ ...prev, [tier]: { ...prev[tier], [field]: v } }));

  const num = (v: string) => (v === "" ? null : Number(v));
  const yearly = (r: Row) => {
    const m = Number(r.monthly) || 0;
    const d = Number(r.deposit) || 0;
    return { recurring: m * 12, year1: d + m * 12 };
  };

  const save = async () => {
    try {
      await update.mutateAsync({
        tier_good_deposit: num(rows.good.deposit), tier_good_monthly: num(rows.good.monthly), tier_good_buyout: num(rows.good.buyout),
        tier_better_deposit: num(rows.better.deposit), tier_better_monthly: num(rows.better.monthly), tier_better_buyout: num(rows.better.buyout),
        tier_best_deposit: num(rows.best.deposit), tier_best_monthly: num(rows.best.monthly), tier_best_buyout: num(rows.best.buyout),
        monthly_close_goal: Number(goal) || 5,
      });
      toast.success("Pricing & goal saved");
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CircleDollarSign className="h-5 w-5" />
          Pricing &amp; Goal
        </CardTitle>
        <CardDescription>
          Per-tier deposit (one-time) + monthly (recurring) + buyout. ARR = 12 × monthly.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Header row */}
        <div className="hidden sm:grid grid-cols-[80px_1fr_1fr_1fr_120px] gap-2 text-xs text-muted-foreground px-1">
          <span></span><span>Deposit ($)</span><span>Monthly ($)</span><span>Buyout ($)</span><span className="text-right">Recurring/yr</span>
        </div>
        {TIERS.map((t) => {
          const y = yearly(rows[t.key]);
          return (
            <div key={t.key} className="grid grid-cols-2 sm:grid-cols-[80px_1fr_1fr_1fr_120px] gap-2 items-center">
              <Label className="text-sm font-medium">{t.label}</Label>
              <Input type="number" min={0} placeholder="deposit" value={rows[t.key].deposit}
                onChange={(e) => set(t.key, "deposit", e.target.value)} disabled={isLoading} className="h-9" />
              <Input type="number" min={0} placeholder="monthly" value={rows[t.key].monthly}
                onChange={(e) => set(t.key, "monthly", e.target.value)} disabled={isLoading} className="h-9" />
              <Input type="number" min={0} placeholder="buyout" value={rows[t.key].buyout}
                onChange={(e) => set(t.key, "buyout", e.target.value)} disabled={isLoading} className="h-9" />
              <span className="text-sm text-right text-muted-foreground col-span-2 sm:col-span-1">
                ${y.recurring.toLocaleString()}/yr
                <span className="block text-[10px]">Yr1 ${y.year1.toLocaleString()}</span>
              </span>
            </div>
          );
        })}
        <div className="grid gap-4 sm:grid-cols-2 items-end pt-2 border-t">
          <div className="space-y-2">
            <Label htmlFor="close-goal">Monthly close goal</Label>
            <Input id="close-goal" type="number" min={1} value={goal}
              onChange={(e) => setGoal(e.target.value)} disabled={isLoading} className="h-9" />
          </div>
          <Button onClick={save} disabled={update.isPending}>
            {update.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
