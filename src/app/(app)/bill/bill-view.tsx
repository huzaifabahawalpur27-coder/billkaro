"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Decimal from "decimal.js";
import {
  Search,
  Trash2,
  Plus,
  UserRound,
  X,
  CheckCircle2,
  ReceiptText,
} from "lucide-react";
import { toast } from "sonner";
import {
  searchProductsAction,
  searchCustomersAction,
  quickAddCustomerAction,
  createSaleAction,
  type SaleReceipt,
} from "./actions";
import { MoneyDisplay } from "@/components/app/money-display";
import { EmptyState } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────

interface ProductHit {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  salePrice: string;
  unitName: string | null;
}

interface CustomerHit {
  id: string;
  name: string;
  phone: string | null;
  currentBalance: string;
}

interface CartLine {
  key: number;
  productId: string | null;
  name: string;
  unitName: string | null;
  cataloguePrice: string | null;
  soldPrice: string;
  quantity: string;
  isOpenItem: boolean;
}

interface Can {
  createBill: boolean;
  discount: boolean;
  changePrice: boolean;
  addCustomer: boolean;
}

const D = (v: string | number) => {
  try {
    const d = new Decimal(v === "" ? 0 : v);
    return d.isFinite() ? d : new Decimal(0);
  } catch {
    return new Decimal(0);
  }
};

// ── Component ────────────────────────────────────────────────

export function BillView({
  initialProducts = [],
  categories = [],
  taxRate,
  currencySymbol,
  can,
}: {
  initialProducts?: (ProductHit & { categoryId: string | null })[];
  categories?: { id: string; name: string }[];
  taxRate: string;
  currencySymbol: string;
  can: Can;
}) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [discountType, setDiscountType] = useState<"NONE" | "FIXED" | "PERCENT">("NONE");
  const [discountValue, setDiscountValue] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [amountPaid, setAmountPaid] = useState("");
  const [paidTouched, setPaidTouched] = useState(false);
  const [cashReceived, setCashReceived] = useState("");
  const [customer, setCustomer] = useState<CustomerHit | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [localSearch, setLocalSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"PRODUCTS" | "CART">("PRODUCTS");
  const [receipt, setReceipt] = useState<SaleReceipt | null>(null);
  const [saving, startSaving] = useTransition();
  const keyRef = useRef(1);

  // Totals — display only; the server recomputes everything.
  const totals = useMemo(() => {
    const subtotal = lines.reduce(
      (sum, l) => sum.add(D(l.soldPrice).mul(D(l.quantity))),
      new Decimal(0)
    );
    let discount = new Decimal(0);
    if (discountType === "FIXED") discount = D(discountValue);
    else if (discountType === "PERCENT") discount = subtotal.mul(D(discountValue)).div(100);
    if (discount.gt(subtotal)) discount = subtotal;
    if (discount.lt(0)) discount = new Decimal(0);
    const taxable = subtotal.sub(discount);
    const tax = taxable.mul(D(taxRate)).div(100);
    const grand = taxable.add(tax).toDecimalPlaces(2);
    return {
      subtotal: subtotal.toDecimalPlaces(2),
      discount: discount.toDecimalPlaces(2),
      tax: tax.toDecimalPlaces(2),
      grand,
    };
  }, [lines, discountType, discountValue, taxRate]);

  // Until the cashier edits it, "received" tracks the full total (cash sale).
  const effectivePaid = paidTouched ? D(amountPaid) : totals.grand;
  const amountDue = Decimal.max(totals.grand.sub(effectivePaid), 0);
  const isUdhaar = amountDue.gt(0);
  const change =
    paymentMethod === "CASH" && cashReceived !== ""
      ? Decimal.max(D(cashReceived).sub(effectivePaid), 0)
      : null;

  const filteredProducts = useMemo(() => {
    return initialProducts.filter((p) => {
      const matchesCategory = !selectedCategory || p.categoryId === selectedCategory;
      const matchesSearch =
        !localSearch.trim() ||
        p.name.toLowerCase().includes(localSearch.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(localSearch.toLowerCase())) ||
        (p.barcode && p.barcode.includes(localSearch));
      return matchesCategory && matchesSearch;
    });
  }, [initialProducts, selectedCategory, localSearch]);

  const cartQuantities = useMemo(() => {
    const map = new Map<string, number>();
    for (const line of lines) {
      if (line.productId) {
        map.set(line.productId, (map.get(line.productId) ?? 0) + parseFloat(line.quantity || "0"));
      }
    }
    return map;
  }, [lines]);

  const addProduct = useCallback((p: ProductHit) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === p.id);
      if (existing) {
        return prev.map((l) =>
          l.productId === p.id
            ? { ...l, quantity: D(l.quantity).add(1).toString() }
            : l
        );
      }
      return [
        ...prev,
        {
          key: keyRef.current++,
          productId: p.id,
          name: p.name,
          unitName: p.unitName,
          cataloguePrice: p.salePrice,
          soldPrice: p.salePrice,
          quantity: "1",
          isOpenItem: false,
        },
      ];
    });
  }, []);

  const addOpenItem = useCallback((name: string, price: string) => {
    setLines((prev) => [
      ...prev,
      {
        key: keyRef.current++,
        productId: null,
        name,
        unitName: null,
        cataloguePrice: null,
        soldPrice: price,
        quantity: "1",
        isOpenItem: true,
      },
    ]);
  }, []);

  const updateLine = (key: number, patch: Partial<CartLine>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const removeLine = (key: number) => setLines((prev) => prev.filter((l) => l.key !== key));

  const resetBill = () => {
    setLines([]);
    setDiscountType("NONE");
    setDiscountValue("");
    setPaymentMethod("CASH");
    setAmountPaid("");
    setPaidTouched(false);
    setCashReceived("");
    setCustomer(null);
    setReceipt(null);
  };

  const submit = () => {
    if (!lines.length) {
      toast.error("Pehle bill mein items add karein.");
      return;
    }
    if (isUdhaar && !customer) {
      toast.error("Udhaar bill ke liye customer select karein.");
      return;
    }
    startSaving(async () => {
      const result = await createSaleAction({
        items: lines.map((l) => ({
          productId: l.productId,
          name: l.isOpenItem ? l.name : undefined,
          soldPrice: D(l.soldPrice).toFixed(2),
          quantity: D(l.quantity).toString(),
        })),
        discountType,
        discountValue: discountValue.trim(),
        customerId: customer?.id ?? null,
        paymentMethod,
        amountPaid: effectivePaid.toFixed(2),
        cashReceived: paymentMethod === "CASH" && cashReceived ? D(cashReceived).toFixed(2) : null,
        notes: null,
      });
      if (result.ok && result.data) {
        setReceipt(result.data);
      } else {
        toast.error(result.error ?? "Bill save nahi ho saka.");
      }
    });
  };

  if (!can.createBill) {
    return (
      <EmptyState
        icon={ReceiptText}
        title="Ijazat nahi"
        description="Aap ke role mein bill banane ki permission nahi hai."
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Mobile Tab Header Switcher */}
      <div className="flex md:hidden border rounded-lg overflow-hidden bg-white mb-2 shadow-sm text-xs font-semibold">
        <button
          type="button"
          className={cn(
            "flex-1 py-2.5 text-center transition-all border-r",
            activeTab === "PRODUCTS" ? "bg-indigo-600 text-white" : "bg-white text-slate-600"
          )}
          onClick={() => setActiveTab("PRODUCTS")}
        >
          Rate List Grid ({filteredProducts.length})
        </button>
        <button
          type="button"
          className={cn(
            "flex-1 py-2.5 text-center transition-all",
            activeTab === "CART" ? "bg-indigo-600 text-white" : "bg-white text-slate-600"
          )}
          onClick={() => setActiveTab("CART")}
        >
          Cart ({lines.length}) & Checkout
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* ── Left: split column into Cart + Product grid ── */}
        <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr] min-w-0">
          
          {/* Cart items list */}
          <div className={cn("space-y-4 min-w-0", activeTab === "PRODUCTS" ? "hidden md:block" : "block")}>
            <ProductSearch onPick={addProduct} onOpenItem={addOpenItem} />

          {lines.length === 0 ? (
            <EmptyState
              icon={ReceiptText}
              title="Bill khali hai"
              description="Product search karein ya open item add karein."
            />
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block rounded-lg border overflow-x-auto bg-white dark:bg-slate-900">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="w-20">Qty</TableHead>
                      <TableHead className="w-24">Price</TableHead>
                      <TableHead className="w-24 text-right">Total</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line) => (
                      <TableRow key={line.key}>
                        <TableCell>
                          <div className="font-medium text-xs truncate max-w-[120px]">{line.name}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {line.isOpenItem ? "Open item" : line.unitName ?? ""}
                            {!line.isOpenItem &&
                              line.cataloguePrice &&
                              !D(line.cataloguePrice).eq(D(line.soldPrice)) && (
                                <span className="ml-1">
                                  · list {formatMoney(line.cataloguePrice, currencySymbol)}
                                </span>
                              )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            inputMode="decimal"
                            className="h-7 px-1.5 text-xs text-center"
                            value={line.quantity}
                            onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                            aria-label={`${line.name} quantity`}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            inputMode="decimal"
                            className="h-7 px-1.5 text-xs text-center"
                            value={line.soldPrice}
                            disabled={!line.isOpenItem && !can.changePrice}
                            onChange={(e) => updateLine(line.key, { soldPrice: e.target.value })}
                            aria-label={`${line.name} price`}
                          />
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          <MoneyDisplay
                            value={D(line.soldPrice).mul(D(line.quantity)).toFixed(2)}
                            symbol={currencySymbol}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-red-600"
                            onClick={() => removeLine(line.key)}
                            aria-label={`Remove ${line.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card List View */}
              <div className="md:hidden space-y-2">
                {lines.map((line) => (
                  <div key={line.key} className="rounded-lg border border-slate-200 bg-white p-3 space-y-2 text-xs">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">{line.name}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {line.isOpenItem ? "Open item" : line.unitName ?? ""}
                          {!line.isOpenItem &&
                            line.cataloguePrice &&
                            !D(line.cataloguePrice).eq(D(line.soldPrice)) && (
                              <span className="ml-1">
                                · list {formatMoney(line.cataloguePrice, currencySymbol)}
                              </span>
                            )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-red-600 shrink-0"
                        onClick={() => removeLine(line.key)}
                        aria-label={`Remove ${line.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between gap-4 pt-1.5 border-t border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider">Qty</span>
                        <Input
                          inputMode="decimal"
                          className="h-7 w-16 text-xs text-center px-1"
                          value={line.quantity}
                          onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                          aria-label={`${line.name} quantity`}
                        />
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider">Price</span>
                        <Input
                          inputMode="decimal"
                          className="h-7 w-20 text-xs text-center px-1"
                          value={line.soldPrice}
                          disabled={!line.isOpenItem && !can.changePrice}
                          onChange={(e) => updateLine(line.key, { soldPrice: e.target.value })}
                          aria-label={`${line.name} price`}
                        />
                      </div>

                      <div className="text-right">
                        <span className="text-[9px] text-slate-400 block uppercase tracking-wider">Total</span>
                        <MoneyDisplay
                          value={D(line.soldPrice).mul(D(line.quantity)).toFixed(2)}
                          symbol={currencySymbol}
                          className="font-bold text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Product Grid panel */}
        <div className={cn("rounded-lg border p-4 bg-white dark:bg-slate-900 flex flex-col space-y-3 max-h-[640px] overflow-hidden", activeTab === "CART" ? "hidden md:flex" : "flex")}>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wide">Rate List Grid</h3>
            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-muted-foreground">
              {filteredProducts.length} items
            </span>
          </div>

          {/* Local filter input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="List filter/search karein..."
              className="pl-8 h-8 text-xs"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
          </div>

          {/* Category Tabs */}
          {categories.length > 0 && (
            <div className="flex gap-1 overflow-x-auto pb-1.5 scrollbar-thin text-[10px] border-b border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  "rounded-full px-2.5 py-0.5 font-medium transition-colors border whitespace-nowrap",
                  selectedCategory === null
                    ? "bg-indigo-600 border-indigo-600 text-white"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400"
                )}
              >
                Sab (All)
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCategory(c.id)}
                  className={cn(
                    "rounded-full px-2.5 py-0.5 font-medium transition-colors border whitespace-nowrap",
                    selectedCategory === c.id
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400"
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto pr-1">
            {filteredProducts.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-8">Koi product nahi mila.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {filteredProducts.map((p) => {
                  const qty = cartQuantities.get(p.id) ?? 0;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addProduct(p)}
                      className={cn(
                        "flex flex-col text-left p-2.5 rounded-lg border transition-all text-xs relative group",
                        qty > 0
                          ? "border-indigo-300 bg-indigo-50/50 dark:border-indigo-900/50 dark:bg-indigo-950/20 shadow-sm"
                          : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
                      )}
                    >
                      {qty > 0 && (
                        <span className="absolute -top-1 -right-1 bg-indigo-600 text-white rounded-full text-[9px] font-bold h-4 min-w-4 px-1 flex items-center justify-center border border-white animate-scale-in">
                          {qty}
                        </span>
                      )}
                      <span className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-2 h-7 leading-tight mb-1">
                        {p.name}
                      </span>
                      <div className="mt-auto flex items-baseline justify-between w-full">
                        <span className="text-[9px] text-muted-foreground">
                          {p.unitName ?? "pcs"}
                        </span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          {currencySymbol} {parseFloat(p.salePrice).toFixed(0)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── Right: totals + payment ── */}
      <div className={cn("space-y-4", activeTab === "PRODUCTS" ? "hidden md:block" : "block")}>
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <MoneyDisplay value={totals.subtotal.toFixed(2)} symbol={currencySymbol} />
          </div>

          {can.discount && (
            <div className="flex items-center gap-2">
              <Select
                value={discountType}
                onValueChange={(v) => setDiscountType(v as typeof discountType)}
              >
                <SelectTrigger className="h-8 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">No discount</SelectItem>
                  <SelectItem value="FIXED">Rs. off</SelectItem>
                  <SelectItem value="PERCENT">% off</SelectItem>
                </SelectContent>
              </Select>
              {discountType !== "NONE" && (
                <Input
                  inputMode="decimal"
                  className="h-8"
                  placeholder={discountType === "PERCENT" ? "%" : "Rs."}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  aria-label="Discount value"
                />
              )}
            </div>
          )}
          {totals.discount.gt(0) && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Discount</span>
              <MoneyDisplay value={`-${totals.discount.toFixed(2)}`} symbol={currencySymbol} />
            </div>
          )}
          {totals.tax.gt(0) && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax ({taxRate}%)</span>
              <MoneyDisplay value={totals.tax.toFixed(2)} symbol={currencySymbol} />
            </div>
          )}

          <Separator />
          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span>
            <MoneyDisplay value={totals.grand.toFixed(2)} symbol={currencySymbol} />
          </div>
        </div>

        <div className="rounded-lg border p-4 space-y-3">
          <div className="grid gap-1.5">
            <Label>Payment method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="CARD">Card</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank transfer</SelectItem>
                <SelectItem value="CREDIT">Udhaar (full)</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label>Received now</Label>
            <Input
              inputMode="decimal"
              value={paidTouched ? amountPaid : totals.grand.toFixed(2)}
              onChange={(e) => {
                setPaidTouched(true);
                setAmountPaid(e.target.value);
              }}
              aria-label="Amount received"
            />
          </div>

          {paymentMethod === "CASH" && !isUdhaar && (
            <div className="grid gap-1.5">
              <Label>Cash tendered (optional)</Label>
              <Input
                inputMode="decimal"
                placeholder="e.g. 1000"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                aria-label="Cash tendered"
              />
              {change && change.gt(0) && (
                <p className="text-sm">
                  Change: <MoneyDisplay value={change.toFixed(2)} symbol={currencySymbol} tone="received" />
                </p>
              )}
            </div>
          )}

          {isUdhaar && (
            <div className="rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-2.5 text-sm">
              Udhaar:{" "}
              <MoneyDisplay value={amountDue.toFixed(2)} symbol={currencySymbol} tone="due" />{" "}
              — customer zaroori hai.
            </div>
          )}

          <CustomerPicker
            customer={customer}
            onSelect={setCustomer}
            canAdd={can.addCustomer}
            currencySymbol={currencySymbol}
            required={isUdhaar}
          />

          <Button className="w-full" size="lg" onClick={submit} disabled={saving || !lines.length}>
            {saving ? "Saving…" : `Complete Bill · ${formatMoney(totals.grand.toFixed(2), currencySymbol)}`}
          </Button>
        </div>
      </div>

      {/* Floating Mobile FAB Checkout Trigger */}
      {activeTab === "PRODUCTS" && lines.length > 0 && (
        <button
          type="button"
          className="fixed bottom-6 right-6 md:hidden bg-indigo-600 text-white rounded-full p-4 shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 z-30 font-semibold text-xs animate-scale-in"
          onClick={() => setActiveTab("CART")}
        >
          <ReceiptText className="h-4.5 w-4.5" />
          <span>Checkout ({lines.length})</span>
        </button>
      )}
    </div>

    {/* ── Success dialog ── */}
      <Dialog open={!!receipt} onOpenChange={(open) => !open && resetBill()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Bill ban gaya
            </DialogTitle>
          </DialogHeader>
          {receipt && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invoice</span>
                <span className="font-mono font-medium">{receipt.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <MoneyDisplay value={receipt.grandTotal} symbol={currencySymbol} />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Received</span>
                <MoneyDisplay value={receipt.amountPaid} symbol={currencySymbol} tone="received" />
              </div>
              {D(receipt.amountDue).gt(0) && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Udhaar{receipt.customerName ? ` (${receipt.customerName})` : ""}
                  </span>
                  <MoneyDisplay value={receipt.amountDue} symbol={currencySymbol} tone="due" />
                </div>
              )}
              {receipt.changeDue && D(receipt.changeDue).gt(0) && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Change</span>
                  <MoneyDisplay value={receipt.changeDue} symbol={currencySymbol} />
                </div>
              )}
              <Button className="w-full mt-2" onClick={resetBill}>
                <Plus className="h-4 w-4 mr-1" /> New Bill
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Product search box ───────────────────────────────────────

function ProductSearch({
  onPick,
  onOpenItem,
}: {
  onPick: (p: ProductHit) => void;
  onOpenItem: (name: string, price: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<ProductHit[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [openItemMode, setOpenItemMode] = useState(false);
  const [openPrice, setOpenPrice] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const seqRef = useRef(0);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    const seq = ++seqRef.current;
    const t = setTimeout(async () => {
      const results = await searchProductsAction(q);
      if (seq !== seqRef.current) return;
      setHits(results);
      setHighlight(0);
      setOpen(true);
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  const setQueryAndReset = (value: string) => {
    setQuery(value);
    if (!value.trim()) {
      seqRef.current++;
      setHits([]);
      setOpen(false);
    }
  };

  const pick = (p: ProductHit) => {
    onPick(p);
    setQuery("");
    setHits([]);
    setOpen(false);
    inputRef.current?.focus();
  };

  const submitOpenItem = () => {
    const name = query.trim();
    const price = openPrice.trim();
    if (!name || !price || !/^\d+(\.\d{1,2})?$/.test(price) || Number(price) <= 0) {
      toast.error("Open item ka naam aur sahi price enter karein.");
      return;
    }
    onOpenItem(name, price);
    setQuery("");
    setOpenPrice("");
    setOpenItemMode(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            className="pl-8"
            placeholder="Product ka naam, SKU ya barcode… (scanner bhi chalega)"
            value={query}
            onChange={(e) => setQueryAndReset(e.target.value)}
            onKeyDown={(e) => {
              if (openItemMode) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlight((h) => Math.min(h + 1, hits.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlight((h) => Math.max(h - 1, 0));
              } else if (e.key === "Enter" && open && hits[highlight]) {
                e.preventDefault();
                pick(hits[highlight]);
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            aria-label="Product search"
          />
        </div>
        {openItemMode ? (
          <>
            <Input
              inputMode="decimal"
              className="w-28"
              placeholder="Price"
              value={openPrice}
              onChange={(e) => setOpenPrice(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitOpenItem()}
              aria-label="Open item price"
            />
            <Button onClick={submitOpenItem}>Add</Button>
            <Button variant="ghost" size="icon" onClick={() => setOpenItemMode(false)} aria-label="Cancel open item">
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            onClick={() => {
              setOpenItemMode(true);
              setOpen(false);
            }}
          >
            <Plus className="h-4 w-4 mr-1" /> Open Item
          </Button>
        )}
      </div>

      {open && !openItemMode && (
        <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover shadow-md max-h-80 overflow-y-auto">
          {hits.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">
              Koi product nahi mila. &ldquo;Open Item&rdquo; use karein.
            </div>
          ) : (
            hits.map((p, i) => (
              <button
                key={p.id}
                type="button"
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent",
                  i === highlight && "bg-accent"
                )}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => pick(p)}
              >
                <span>
                  <span className="font-medium">{p.name}</span>
                  {p.sku && <span className="ml-2 text-xs text-muted-foreground">{p.sku}</span>}
                </span>
                <MoneyDisplay value={p.salePrice} />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Customer picker ──────────────────────────────────────────

function CustomerPicker({
  customer,
  onSelect,
  canAdd,
  currencySymbol,
  required,
}: {
  customer: CustomerHit | null;
  onSelect: (c: CustomerHit | null) => void;
  canAdd: boolean;
  currencySymbol: string;
  required: boolean;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<CustomerHit[]>([]);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [pending, startTransition] = useTransition();
  const seqRef = useRef(0);

  useEffect(() => {
    if (!open) return;
    const seq = ++seqRef.current;
    const t = setTimeout(async () => {
      const results = await searchCustomersAction(query.trim());
      if (seq === seqRef.current) setHits(results);
    }, 200);
    return () => clearTimeout(t);
  }, [query, open]);

  const quickAdd = () => {
    if (!newName.trim()) {
      toast.error("Customer ka naam zaroori hai.");
      return;
    }
    startTransition(async () => {
      const result = await quickAddCustomerAction(newName.trim(), newPhone.trim());
      if (result.ok && result.data) {
        onSelect(result.data);
        setAdding(false);
        setOpen(false);
        setNewName("");
        setNewPhone("");
        toast.success(`"${result.data.name}" add ho gaya.`);
      } else {
        toast.error(result.error ?? "Customer add nahi ho saka.");
      }
    });
  };

  if (customer) {
    return (
      <div className="flex items-center justify-between rounded-md border p-2.5 text-sm">
        <span className="flex items-center gap-2 min-w-0">
          <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">
            <span className="font-medium">{customer.name}</span>
            {D(customer.currentBalance).gt(0) && (
              <span className="ml-2 text-xs text-muted-foreground">
                khata {formatMoney(customer.currentBalance, currencySymbol)}
              </span>
            )}
          </span>
        </span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onSelect(null)} aria-label="Remove customer">
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      {!open ? (
        <Button
          variant={required ? "default" : "outline"}
          className="w-full"
          onClick={() => setOpen(true)}
        >
          <UserRound className="h-4 w-4 mr-1" />
          {required ? "Customer select karein (zaroori)" : "Customer (optional)"}
        </Button>
      ) : (
        <div className="rounded-md border p-2 space-y-2">
          {adding ? (
            <>
              <Input
                placeholder="Customer ka naam"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                aria-label="New customer name"
              />
              <Input
                placeholder="Phone (optional)"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                aria-label="New customer phone"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={quickAdd} disabled={pending}>
                  {pending ? "Saving…" : "Save"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              <Input
                autoFocus
                placeholder="Naam ya phone se search…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Customer search"
              />
              <div className="max-h-44 overflow-y-auto">
                {hits.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                    onClick={() => {
                      onSelect(c);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    <span>
                      {c.name}
                      {c.phone && <span className="ml-2 text-xs text-muted-foreground">{c.phone}</span>}
                    </span>
                    {D(c.currentBalance).gt(0) && (
                      <MoneyDisplay value={c.currentBalance} symbol={currencySymbol} tone="due" className="text-xs" />
                    )}
                  </button>
                ))}
                {hits.length === 0 && (
                  <p className="px-2 py-1.5 text-sm text-muted-foreground">Koi customer nahi mila.</p>
                )}
              </div>
              <div className="flex gap-2">
                {canAdd && (
                  <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Naya customer
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
                  Close
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
