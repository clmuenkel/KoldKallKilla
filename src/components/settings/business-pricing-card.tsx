"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CircleDollarSign } from "lucide-react";
import { useBusinessSettings, useUpdateBusinessSettings } from "@/hooks/use-clients";
import { toast } from "sonner";

/** Settings block: the 3 plan-tier annual prices + the monthly close goal. */
export function BusinessPricingCard() {
  const { data, isLoading } = useBusinessSettings();
  const update = useUpdateBusinessSettings();

  const [good, setGood] = useState("");
  const [better, setBetter] = useState("");
  const [best, setBest] = useState("");
  const [goal, setGoal] = useState("5");

  useEffect(() => {
    if (data) {
      setGood(data.tier_good_annual != null ? String(data.tier_good_annual) : "");
      setBetter(data.tier_better_annual != null ? String(data.tier_better_annual) : "");
      setBest(data.tier_best_annual != null ? String(data.tier_best_annual) : "");
      setGoal(String(data.monthly_close_goal ?? 5));
    }
  }, [data]);

  const save = async () => {
    try {
      await update.mutateAsync({
        tier_good_annual: good === "" ? null : Number(good),
        tier_better_annual: better === "" ? null : Number(better),
        tier_best_annual: best === "" ? null : Number(best),
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
          Annual value per plan tier (used to compute ARR), and your monthly close goal.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="tier-good">Good ($/yr)</Label>
            <Input id="tier-good" type="number" min={0} value={good} placeholder="e.g. 5000"
              onChange={(e) => setGood(e.target.value)} disabled={isLoading} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tier-better">Better ($/yr)</Label>
            <Input id="tier-better" type="number" min={0} value={better} placeholder="e.g. 8000"
              onChange={(e) => setBetter(e.target.value)} disabled={isLoading} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tier-best">Best ($/yr)</Label>
            <Input id="tier-best" type="number" min={0} value={best} placeholder="e.g. 12000"
              onChange={(e) => setBest(e.target.value)} disabled={isLoading} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 items-end">
          <div className="space-y-2">
            <Label htmlFor="close-goal">Monthly close goal</Label>
            <Input id="close-goal" type="number" min={1} value={goal}
              onChange={(e) => setGoal(e.target.value)} disabled={isLoading} />
          </div>
          <Button onClick={save} disabled={update.isPending}>
            {update.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
