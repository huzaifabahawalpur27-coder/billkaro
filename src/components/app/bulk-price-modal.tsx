"use client";

import { useState, useTransition } from "react";
import { ArrowLeft, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import {
  previewBulkPriceAction,
  applyBulkPriceAction,
  type BulkPriceInput,
  type BulkPreviewData,
} from "@/app/(app)/brands/bulk-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

interface BulkPriceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Brand mode: target every active product of this brand. */
  brand?: { id: string; name: string } | null;
  /** Selection mode: target these products. */
  productIds?: string[];
}

export function BulkPriceModal({ open, onOpenChange, brand, productIds }: BulkPriceModalProps) {
  const [step, setStep] = useState<"form" | "preview">("form");
  const [priceType, setPriceType] = useState<BulkPriceInput["priceType"]>("SALE");
  const [direction, setDirection] = useState<BulkPriceInput["direction"]>("INCREASE");
  const [percent, setPercent] = useState("");
  const [rounding, setRounding] = useState<BulkPriceInput["rounding"]>("NONE");
  const [preview, setPreview] = useState<BulkPreviewData | null>(null);
  const [pending, startTransition] = useTransition();

  const targetLabel = brand ? brand.name : `${productIds?.length ?? 0} selected products`;

  function buildInput(): BulkPriceInput {
    return {
      brandId: brand?.id,
      productIds: brand ? undefined : productIds,
      priceType,
      direction,
      percent: percent.trim(),
      rounding,
    };
  }

  function handlePreview() {
    startTransition(async () => {
      const result = await previewBulkPriceAction(buildInput());
      if (result.ok && result.data) {
        setPreview(result.data);
        setStep("preview");
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleApply() {
    startTransition(async () => {
      const result = await applyBulkPriceAction(buildInput());
      if (result.ok && result.data) {
        toast.success(`${result.data.updated} product prices update ho gayin.`);
        handleClose();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleClose() {
    onOpenChange(false);
    setStep("form");
    setPreview(null);
    setPercent("");
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === "form" ? "Update Prices" : "Price Update Preview"}
          </DialogTitle>
        </DialogHeader>

        {step === "form" ? (
          <div className="space-y-4">
            <div className="rounded-md bg-slate-50 px-3 py-2 text-sm">
              <span className="text-slate-500">Target: </span>
              <span className="font-medium text-slate-900">{targetLabel}</span>
            </div>

            <div className="space-y-1.5">
              <Label>Price Type</Label>
              <Select value={priceType} onValueChange={(v) => setPriceType(v as typeof priceType)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SALE">Sale Price</SelectItem>
                  <SelectItem value="PURCHASE">Purchase Price</SelectItem>
                  <SelectItem value="WHOLESALE">Wholesale Price</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Adjustment</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDirection("INCREASE")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium",
                    direction === "INCREASE"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <TrendingUp className="size-4" /> Increase
                </button>
                <button
                  type="button"
                  onClick={() => setDirection("DECREASE")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium",
                    direction === "DECREASE"
                      ? "border-red-300 bg-red-50 text-red-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <TrendingDown className="size-4" /> Decrease
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bp-percent">Percentage</Label>
              <div className="relative">
                <Input
                  id="bp-percent"
                  inputMode="decimal"
                  value={percent}
                  onChange={(e) => setPercent(e.target.value)}
                  placeholder="10"
                  className="pr-8"
                  autoFocus
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                  %
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Rounding</Label>
              <RadioGroup
                value={rounding}
                onValueChange={(v) => setRounding(v as typeof rounding)}
                className="grid grid-cols-2 gap-2"
              >
                {(
                  [
                    ["NONE", "No Rounding"],
                    ["NEAREST_1", "Nearest 1"],
                    ["NEAREST_5", "Nearest 5"],
                    ["NEAREST_10", "Nearest 10"],
                  ] as const
                ).map(([value, label]) => (
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

            <Button className="w-full" onClick={handlePreview} disabled={pending || !percent.trim()}>
              {pending ? "Loading preview..." : "Preview Changes"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md bg-slate-50 px-3 py-2 text-sm">
              <span className="font-medium text-slate-900">{targetLabel}</span>
              <span className="text-slate-500">
                {" "}
                · {percent}% {direction === "INCREASE" ? "increase" : "decrease"} ·{" "}
                <span className="font-semibold text-slate-900">
                  {preview?.totalAffected} products affected
                </span>
              </span>
            </div>

            <div className="max-h-[320px] overflow-y-auto rounded-md border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Current</TableHead>
                    <TableHead className="text-right">New</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview?.rows.map((row) => {
                    const diff = Number(row.newPrice) - Number(row.oldPrice ?? 0);
                    return (
                      <TableRow key={row.productId}>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.oldPrice ? formatMoney(row.oldPrice) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatMoney(row.newPrice)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right tabular-nums",
                            diff > 0 ? "text-emerald-600" : diff < 0 ? "text-red-600" : "text-slate-400"
                          )}
                        >
                          {diff > 0 ? "+" : ""}
                          {formatMoney(diff)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <p className="text-sm text-amber-700">
              Yeh {preview?.totalAffected} products ki prices update kar dega. Yeh action wapas
              nahi hota — lekin har change Price History mein mehfooz rahega.
            </p>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("form")} disabled={pending}>
                <ArrowLeft className="size-4" /> Back
              </Button>
              <Button className="flex-1" onClick={handleApply} disabled={pending}>
                {pending ? "Updating Prices..." : "Confirm Price Update"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
