"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateContact } from "@/hooks/use-contacts";
import { useBusinessSettings, effectiveClientValue, effectiveClientMonthly, tierMonthly, tierDeposit, tierBuyout } from "@/hooks/use-clients";
import { formatDateForDB } from "@/lib/utils";
import { CircleDollarSign, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { Contact } from "@/types/database";

const TIERS = [
  { value: "good", label: "Good" },
  { value: "better", label: "Better" },
  { value: "best", label: "Best" },
];

/**
 * Client card — shown on the contact page when the contact is a won client.
 * Captures plan tier (or exact $ override), became-client date, and churn.
 */
export function ClientCard({ contact }: { contact: Contact }) {
  const update = useUpdateContact();
  const { data: settings } = useBusinessSettings();
  const isCustom = contact.deal_value_monthly != null || contact.deposit_paid != null;
  const [customOpen, setCustomOpen] = useState(isCustom);
  const [customMonthly, setCustomMonthly] = useState(
    contact.deal_value_monthly != null ? String(contact.deal_value_monthly) : ""
  );
  const [customDeposit, setCustomDeposit] = useState(
    contact.deposit_paid != null ? String(contact.deposit_paid) : ""
  );

  const isChurned = !!contact.churned_at;
  const annual = effectiveClientValue(contact, settings);
  const monthly = effectiveClientMonthly(contact, settings);

  const patch = async (updates: Record<string, unknown>, msg: string) => {
    try {
      await update.mutateAsync({ id: contact.id, updates });
      toast.success(msg);
    } catch (e: any) {
      toast.error(e.message || "Failed to update");
    }
  };

  return (
    <Card className={isChurned ? "border-destructive/40" : "border-emerald-500/40"}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CircleDollarSign className="h-4 w-4" />
            Client
          </CardTitle>
          {isChurned ? (
            <Badge variant="destructive" className="text-[10px]">Churned</Badge>
          ) : (
            <Badge className="bg-emerald-500 text-white text-[10px]">
              Active · ${Math.round(monthly).toLocaleString()}/mo
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Plan tier */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Plan tier</Label>
          <Select
            value={contact.plan_tier ?? ""}
            onValueChange={(v) => patch({ plan_tier: v }, `Tier set to ${v}`)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Choose a tier" />
            </SelectTrigger>
            <SelectContent>
              {TIERS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                  {settings && tierMonthly(t.value, settings) > 0 && (
                    <span className="text-muted-foreground ml-2">
                      ${tierMonthly(t.value, settings).toLocaleString()}/mo
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {contact.plan_tier && contact.deal_value_annual == null && settings && (
            <p className="text-[11px] text-muted-foreground">
              Deposit ${tierDeposit(contact.plan_tier, settings).toLocaleString()} ·
              ${Math.round(annual).toLocaleString()}/yr recurring ·
              Buyout ${tierBuyout(contact.plan_tier, settings).toLocaleString()}
            </p>
          )}
        </div>

        {/* Custom pricing (overrides tier) — for non-standard deals */}
        {customOpen ? (
          <div className="space-y-2 rounded-md border bg-muted/30 p-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Custom pricing (overrides tier)</Label>
              <button
                className="text-[11px] text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setCustomOpen(false); setCustomMonthly(""); setCustomDeposit("");
                  patch({ deal_value_monthly: null, deposit_paid: null }, "Custom pricing cleared");
                }}
              >
                clear
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Monthly ($)</Label>
                <Input type="number" value={customMonthly} placeholder="e.g. 75" className="h-9"
                  onChange={(e) => setCustomMonthly(e.target.value)}
                  onBlur={() => patch({ deal_value_monthly: customMonthly === "" ? null : Number(customMonthly) }, "Monthly saved")} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Deposit ($)</Label>
                <Input type="number" value={customDeposit} placeholder="e.g. 3500" className="h-9"
                  onChange={(e) => setCustomDeposit(e.target.value)}
                  onBlur={() => patch({ deposit_paid: customDeposit === "" ? null : Number(customDeposit) }, "Deposit saved")} />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              ${Math.round(annual).toLocaleString()}/yr recurring
            </p>
          </div>
        ) : (
          <button
            className="text-xs text-muted-foreground hover:text-foreground underline"
            onClick={() => setCustomOpen(true)}
          >
            Custom pricing instead of tier
          </button>
        )}

        {/* Became client date */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Became client on</Label>
          <input
            type="date"
            value={contact.became_client_at ?? ""}
            onChange={(e) => patch({ became_client_at: e.target.value || null }, "Start date saved")}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>

        {/* Churn toggle */}
        {isChurned ? (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Churned {contact.churned_at}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-emerald-600"
              onClick={() => patch({ churned_at: null }, "Reactivated")}
            >
              <CheckCircle2 className="h-4 w-4" />
              Reactivate
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5 text-destructive"
            onClick={() => patch({ churned_at: formatDateForDB(new Date()) }, "Marked churned")}
          >
            <XCircle className="h-4 w-4" />
            Mark churned
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
