"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateSettingsAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";

interface Settings {
  currencyCode: string;
  currencySymbol: string;
  invoicePrefix: string;
  receiptPrefix: string;
  defaultTaxRate: string;
  receiptSize: string;
  priceRounding: string;
  invoiceFooter: string;
  language: string;
}

export function SettingsView({ settings: initial }: { settings: Settings }) {
  const router = useRouter();
  const [s, setS] = useState<Settings>(initial);
  const [pending, startTransition] = useTransition();
  const [dirty, setDirty] = useState(false);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setS((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  function save() {
    startTransition(async () => {
      const result = await updateSettingsAction(s);
      if (result.ok) {
        toast.success("Settings save ho gayi.");
        setDirty(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Save nahi ho sake.");
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Currency */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Currency</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="currency-code">Currency Code</Label>
            <Input
              id="currency-code"
              value={s.currencyCode}
              onChange={(e) => update("currencyCode", e.target.value)}
              placeholder="PKR"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="currency-symbol">Currency Symbol</Label>
            <Input
              id="currency-symbol"
              value={s.currencySymbol}
              onChange={(e) => update("currencySymbol", e.target.value)}
              placeholder="Rs."
            />
          </div>
        </div>
      </section>

      <Separator />

      {/* Invoice / Receipt numbering */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Invoice & Receipt Numbering
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="inv-prefix">Invoice Prefix</Label>
            <Input
              id="inv-prefix"
              value={s.invoicePrefix}
              onChange={(e) => update("invoicePrefix", e.target.value.toUpperCase())}
              placeholder="INV"
            />
            <p className="text-xs text-muted-foreground">Example: {s.invoicePrefix || "INV"}-000001</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pay-prefix">Payment Receipt Prefix</Label>
            <Input
              id="pay-prefix"
              value={s.receiptPrefix}
              onChange={(e) => update("receiptPrefix", e.target.value.toUpperCase())}
              placeholder="PAY"
            />
            <p className="text-xs text-muted-foreground">Example: {s.receiptPrefix || "PAY"}-000001</p>
          </div>
        </div>
      </section>

      <Separator />

      {/* Tax */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Tax</h2>
        <div className="space-y-1.5 max-w-xs">
          <Label htmlFor="tax-rate">Default Tax Rate (%)</Label>
          <div className="relative">
            <Input
              id="tax-rate"
              inputMode="decimal"
              value={s.defaultTaxRate}
              onChange={(e) => update("defaultTaxRate", e.target.value)}
              placeholder="0"
              className="pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
          </div>
          <p className="text-xs text-muted-foreground">0 means no tax. Change affects new bills only.</p>
        </div>
      </section>

      <Separator />

      {/* Receipt */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Receipt / Print</h2>
        <div className="space-y-1.5">
          <Label>Receipt Size</Label>
          <RadioGroup
            value={s.receiptSize}
            onValueChange={(v) => update("receiptSize", v)}
            className="grid grid-cols-3 gap-2"
          >
            {[
              ["THERMAL_58", "58mm Thermal"],
              ["THERMAL_80", "80mm Thermal"],
              ["A4", "A4 Paper"],
            ].map(([value, label]) => (
              <Label
                key={value}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-normal has-[[data-state=checked]]:border-indigo-300 has-[[data-state=checked]]:bg-indigo-50"
              >
                <RadioGroupItem value={value} />
                {label}
              </Label>
            ))}
          </RadioGroup>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="footer-text">Invoice Footer Text</Label>
          <Textarea
            id="footer-text"
            value={s.invoiceFooter}
            onChange={(e) => update("invoiceFooter", e.target.value)}
            placeholder="Thank You For Shopping!"
            rows={2}
          />
        </div>
      </section>

      <Separator />

      {/* Price rounding */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Price Rounding</h2>
        <div className="space-y-1.5">
          <Label>Rounding Rule (for bulk price updates)</Label>
          <RadioGroup
            value={s.priceRounding}
            onValueChange={(v) => update("priceRounding", v)}
            className="grid grid-cols-2 gap-2"
          >
            {[
              ["NONE", "No Rounding"],
              ["NEAREST_1", "Nearest 1"],
              ["NEAREST_5", "Nearest 5"],
              ["NEAREST_10", "Nearest 10"],
            ].map(([value, label]) => (
              <Label
                key={value}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-normal has-[[data-state=checked]]:border-indigo-300 has-[[data-state=checked]]:bg-indigo-50"
              >
                <RadioGroupItem value={value} />
                {label}
              </Label>
            ))}
          </RadioGroup>
        </div>
      </section>

      <div className="pt-2">
        <Button onClick={save} disabled={pending || !dirty} className="w-full sm:w-auto">
          {pending ? "Saving…" : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
