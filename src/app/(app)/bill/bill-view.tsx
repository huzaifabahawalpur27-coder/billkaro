"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import Decimal from "decimal.js";
import {
  Search,
  Trash2,
  Plus,
  Minus,
  Printer,
  UserRound,
  X,
  CheckCircle2,
  ReceiptText,
  FileClock,
} from "lucide-react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  searchProductsAction,
  searchCustomersAction,
  quickAddCustomerAction,
  createSaleAction,
  modifySaleAction,
  createQuotationAction,
  type SaleReceipt,
  type QuotationReceipt,
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
import { formatMoney, formatQty, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────

interface ProductHit {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  salePrice: string;
  unitName: string | null;
  /** Weight/loose unit — POS allows fractional quantities. */
  isFractional?: boolean;
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
  isFractional: boolean;
  cataloguePrice: string | null;
  soldPrice: string;
  quantity: string;
  isOpenItem: boolean;
}

export interface SourceQuotation {
  id: string;
  quotationNumber: string;
  status: string;
  lines: {
    productId: string | null;
    name: string;
    unitName: string | null;
    isFractional: boolean;
    cataloguePrice: string | null;
    soldPrice: string;
    quantity: string;
    isOpenItem: boolean;
  }[];
  customer: CustomerHit | null;
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

const CATEGORY_COLORS = [
  {
    active: "bg-rose-600 border-rose-600 text-white dark:bg-rose-500 dark:border-rose-500",
    inactive: "border-rose-200 bg-rose-50/50 text-rose-700 hover:bg-rose-100/70 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400"
  },
  {
    active: "bg-amber-600 border-amber-600 text-white dark:bg-amber-500 dark:border-amber-500",
    inactive: "border-amber-200 bg-amber-50/50 text-amber-700 hover:bg-amber-100/70 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400"
  },
  {
    active: "bg-emerald-600 border-emerald-600 text-white dark:bg-emerald-500 dark:border-emerald-500",
    inactive: "border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100/70 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-400"
  },
  {
    active: "bg-sky-600 border-sky-600 text-white dark:bg-sky-500 dark:border-sky-500",
    inactive: "border-sky-200 bg-sky-50/50 text-sky-700 hover:bg-sky-100/70 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-400"
  },
  {
    active: "bg-violet-600 border-violet-600 text-white dark:bg-violet-500 dark:border-violet-500",
    inactive: "border-violet-200 bg-violet-50/50 text-violet-700 hover:bg-violet-100/70 dark:border-violet-900/40 dark:bg-violet-950/20 dark:text-violet-400"
  },
  {
    active: "bg-teal-600 border-teal-600 text-white dark:bg-teal-500 dark:border-teal-500",
    inactive: "border-teal-200 bg-teal-50/50 text-teal-700 hover:bg-teal-100/70 dark:border-teal-900/40 dark:bg-teal-950/20 dark:text-teal-400"
  },
  {
    active: "bg-orange-600 border-orange-600 text-white dark:bg-orange-500 dark:border-orange-500",
    inactive: "border-orange-200 bg-orange-50/50 text-orange-700 hover:bg-orange-100/70 dark:border-orange-900/40 dark:bg-orange-950/20 dark:text-orange-400"
  },
  {
    active: "bg-pink-600 border-pink-600 text-white dark:bg-pink-500 dark:border-pink-500",
    inactive: "border-pink-200 bg-pink-50/50 text-pink-700 hover:bg-pink-100/70 dark:border-pink-900/40 dark:bg-pink-950/20 dark:text-pink-400"
  },
  {
    active: "bg-cyan-600 border-cyan-600 text-white dark:bg-cyan-500 dark:border-cyan-500",
    inactive: "border-cyan-200 bg-cyan-50/50 text-cyan-700 hover:bg-cyan-100/70 dark:border-cyan-900/40 dark:bg-cyan-950/20 dark:text-cyan-400"
  },
  {
    active: "bg-fuchsia-600 border-fuchsia-600 text-white dark:bg-fuchsia-500 dark:border-fuchsia-500",
    inactive: "border-fuchsia-200 bg-fuchsia-50/50 text-fuchsia-700 hover:bg-fuchsia-100/70 dark:border-fuchsia-900/40 dark:bg-fuchsia-950/20 dark:text-fuchsia-400"
  }
];

const ACCENT_COLORS = [
  "border-l-rose-500",
  "border-l-amber-500",
  "border-l-emerald-500",
  "border-l-sky-500",
  "border-l-indigo-500",
  "border-l-violet-500",
  "border-l-teal-500",
  "border-l-orange-500",
  "border-l-pink-500",
  "border-l-cyan-500",
  "border-l-fuchsia-500"
];

// ── Component ────────────────────────────────────────────────

export interface EditSale {
  id: string;
  invoiceNumber: string;
  customerId: string | null;
  discountType: string;
  discountValue: string;
  paymentMethod: string;
  amountPaid: string;
  notes: string | null;
  customer: { id: string; name: string; phone: string | null } | null;
  items: {
    productId: string | null;
    name: string;
    soldPrice: string;
    quantity: string;
    isOpenItem: boolean;
  }[];
}

export function BillView({
  initialProducts = [],
  categories = [],
  taxRate,
  currencySymbol,
  quotationsEnabled = false,
  defaultValidityDays = 7,
  sourceQuotation = null,
  initialEditSale = null,
  can,
}: {
  initialProducts?: (ProductHit & { categoryId: string | null })[];
  categories?: { id: string; name: string }[];
  taxRate: string;
  currencySymbol: string;
  quotationsEnabled?: boolean;
  defaultValidityDays?: number;
  sourceQuotation?: SourceQuotation | null;
  initialEditSale?: EditSale | null;
  can: Can;
}) {
  const [lines, setLines] = useState<CartLine[]>(() => {
    if (initialEditSale) {
      return initialEditSale.items.map((item, i) => {
        const prod = item.productId ? initialProducts.find(p => p.id === item.productId) : null;
        return {
          key: i + 1,
          productId: item.productId,
          name: item.name,
          unitName: prod?.unitName ?? null,
          isFractional: prod?.isFractional ?? false,
          cataloguePrice: prod?.salePrice ?? null,
          soldPrice: item.soldPrice,
          quantity: item.quantity,
          isOpenItem: item.isOpenItem,
        };
      });
    }
    return (sourceQuotation?.lines ?? []).map((l, i) => ({ ...l, key: i + 1 }));
  });

  const [discountType, setDiscountType] = useState<"NONE" | "FIXED" | "PERCENT">(() => {
    if (initialEditSale) return initialEditSale.discountType as any;
    return "NONE";
  });

  const [discountValue, setDiscountValue] = useState(() => {
    if (initialEditSale) {
      return parseFloat(initialEditSale.discountValue) > 0 ? initialEditSale.discountValue : "";
    }
    return "";
  });

  const [paymentMethod, setPaymentMethod] = useState(() => {
    if (initialEditSale) return initialEditSale.paymentMethod;
    return "CASH";
  });

  const [amountPaid, setAmountPaid] = useState(() => {
    if (initialEditSale) return initialEditSale.amountPaid;
    return "";
  });

  const [paidTouched, setPaidTouched] = useState(() => {
    if (initialEditSale) return true;
    return false;
  });

  const [cashReceived, setCashReceived] = useState("");

  const [customer, setCustomer] = useState<CustomerHit | null>(() => {
    if (initialEditSale) {
      return initialEditSale.customer ? {
        id: initialEditSale.customer.id,
        name: initialEditSale.customer.name,
        phone: initialEditSale.customer.phone,
        currentBalance: "0",
      } : null;
    }
    return sourceQuotation?.customer ?? null;
  });

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [openItemMode, setOpenItemMode] = useState(false);
  const [activeTab, setActiveTab] = useState<"PRODUCTS" | "CART">("PRODUCTS");
  const [receipt, setReceipt] = useState<SaleReceipt | null>(null);
  const [quotationReceipt, setQuotationReceipt] = useState<QuotationReceipt | null>(null);
  const [quotationDialog, setQuotationDialog] = useState(false);
  const [validityDays, setValidityDays] = useState(String(defaultValidityDays));
  const [saving, startSaving] = useTransition();
  const keyRef = useRef((sourceQuotation?.lines.length ?? 0) + 1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const receivedInputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();

  const focusSearch = useCallback(() => {
    // Delayed so it wins over Radix's own focus-restore on dialog close.
    setTimeout(() => searchInputRef.current?.focus(), 80);
  }, []);

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
    const q = query.trim().toLowerCase();
    return initialProducts.filter((p) => {
      const matchesCategory = !selectedCategory || p.categoryId === selectedCategory;
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [initialProducts, selectedCategory, query]);

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
          isFractional: p.isFractional ?? false,
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
        isFractional: false,
        cataloguePrice: null,
        soldPrice: price,
        quantity: "1",
        isOpenItem: true,
      },
    ]);
  }, []);

  const updateLine = (key: number, patch: Partial<CartLine>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const removeLine = (key: number) => {
    const next = lines.filter((l) => l.key !== key);
    setLines(next);
    if (next.length === 0) {
      // A stale manual "Received" makes no sense against an empty bill.
      setPaidTouched(false);
      setAmountPaid("");
    }
  };

  const resetPaid = () => {
    setPaidTouched(false);
    setAmountPaid("");
  };

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
    setQuotationReceipt(null);
    if (sourceQuotation) router.replace("/bill");
    focusSearch();
  };

  const saveQuotation = () => {
    if (saving || quotationReceipt) return;
    if (!lines.length) {
      toast.error("Pehle items add karein.");
      return;
    }
    startSaving(async () => {
      const result = await createQuotationAction({
        items: lines.map((l) => ({
          productId: l.productId,
          name: l.isOpenItem ? l.name : undefined,
          soldPrice: D(l.soldPrice).toFixed(2),
          quantity: D(l.quantity).toString(),
        })),
        discountType,
        discountValue: discountValue.trim(),
        customerId: customer?.id ?? null,
        validityDays: parseInt(validityDays, 10) || undefined,
        notes: null,
      });
      if (result.ok && result.data) {
        setQuotationDialog(false);
        setQuotationReceipt(result.data);
      } else {
        toast.error(result.error ?? "Quotation save nahi ho saki.");
      }
    });
  };

  const submit = () => {
    if (saving || receipt || quotationReceipt) return;
    if (!lines.length) {
      toast.error("Pehle bill mein items add karein.");
      return;
    }
    if (isUdhaar && !customer) {
      toast.error("Udhaar bill ke liye customer select karein.");
      return;
    }
    startSaving(async () => {
      const payload = {
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
        notes: initialEditSale ? `Revised from invoice ${initialEditSale.invoiceNumber}` : null,
      };

      const result = initialEditSale
        ? await modifySaleAction({
            originalSaleId: initialEditSale.id,
            saleData: payload,
          })
        : await createSaleAction({
            ...payload,
            quotationId: sourceQuotation?.id ?? null,
          });

      if (result.ok && result.data) {
        setReceipt(result.data);
      } else {
        toast.error(result.error ?? "Bill save nahi ho saka.");
      }
    });
  };

  useKeyboardShortcuts([
    { key: "F2", handler: () => searchInputRef.current?.focus(), allowInInputs: true },
    { key: "F4", handler: () => submit(), allowInInputs: true },
    { key: "F6", handler: () => setOpenItemMode((v) => !v), allowInInputs: true },
    { key: "F8", handler: () => receivedInputRef.current?.focus(), allowInInputs: true },
    { key: "/", handler: () => searchInputRef.current?.focus() },
  ]);

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
      {initialEditSale && (
        <div className="bg-indigo-55/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-650 text-white shadow-md">
              <ReceiptText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Bill tabdeel ya wapas ho raha hai — <span className="font-mono">{initialEditSale.invoiceNumber}</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                Cart items tabdeel karein. Save karne par purana bill cancel ho kar revised bill banega.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild className="shrink-0 self-end sm:self-auto border-slate-200 hover:bg-slate-100">
            <Link href={`/bills/${initialEditSale.id}`}>Cancel Edit</Link>
          </Button>
        </div>
      )}

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
        <div className="grid gap-6 md:grid-cols-[1.3fr_0.7fr] min-w-0">
          
          {/* Cart items list */}
          <div className={cn("space-y-4 min-w-0 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-sm", activeTab === "PRODUCTS" ? "hidden md:block" : "block")}>
            <ProductSearch
              query={query}
              onQueryChange={setQuery}
              preloaded={initialProducts}
              openItemMode={openItemMode}
              onOpenItemModeChange={setOpenItemMode}
              onPick={addProduct}
              onOpenItem={addOpenItem}
              inputRef={searchInputRef}
              onRequestFocus={focusSearch}
            />
            {sourceQuotation && (
              <div className="rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-2.5 text-sm">
                <FileClock className="mr-1 inline h-4 w-4" />
                Quotation <span className="font-mono font-semibold">{sourceQuotation.quotationNumber}</span> se
                load hua — rates <strong>current</strong> hain, review kar ke bill complete karein.
              </div>
            )}
            <div className="hidden md:flex items-center flex-wrap gap-x-4 gap-y-1.5 text-[10.5px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <kbd className="bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-300 dark:border-slate-700 text-slate-750 dark:text-slate-300 rounded px-1.5 py-0.5 font-sans font-semibold text-[10px] shadow-sm tracking-wide">F2</kbd>
                <span>Search</span>
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-300 dark:border-slate-700 text-slate-750 dark:text-slate-300 rounded px-1.5 py-0.5 font-sans font-semibold text-[10px] shadow-sm tracking-wide">F4</kbd>
                <span>Complete Bill</span>
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-300 dark:border-slate-700 text-slate-750 dark:text-slate-300 rounded px-1.5 py-0.5 font-sans font-semibold text-[10px] shadow-sm tracking-wide">F6</kbd>
                <span>Open Item</span>
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-300 dark:border-slate-700 text-slate-750 dark:text-slate-300 rounded px-1.5 py-0.5 font-sans font-semibold text-[10px] shadow-sm tracking-wide">F8</kbd>
                <span>Received</span>
              </span>
            </div>

          {lines.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 min-h-[300px]">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 mb-4 shadow-inner">
                <ReceiptText className="h-7 w-7" />
              </div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-base">Apka bill abhi khali hai</h3>
              <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500 max-w-[260px] leading-relaxed">
                Rate list se products select karein, upar search karein ya barcode scan karein.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto border-t border-slate-100 dark:border-slate-800 pt-3">
                <Table className="w-full [&_td]:px-1 [&_th]:px-1 [&_td]:py-1.5 [&_th]:py-1.5">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="w-[102px]">Qty</TableHead>
                      <TableHead className="w-[55px] text-center">Price</TableHead>
                      <TableHead className="w-[55px] text-right">Total</TableHead>
                      <TableHead className="w-[30px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line) => (
                      <TableRow key={line.key}>
                        <TableCell>
                          <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs leading-tight break-words line-clamp-2">{line.name}</div>
                          <div className="text-[9.5px] text-muted-foreground">
                            {line.isOpenItem
                              ? "Open item"
                              : line.isFractional
                                ? formatQty(line.quantity, line.unitName ?? "")
                                : (line.unitName ?? "")}
                            {!line.isOpenItem &&
                              line.cataloguePrice &&
                              !D(line.cataloguePrice).eq(D(line.soldPrice)) && (
                                <span className="ml-1 text-[9px]">
                                  · list {formatMoney(line.cataloguePrice, currencySymbol)}
                                </span>
                              )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <QtyStepper
                            value={line.quantity}
                            label={`${line.name} quantity`}
                            fractional={line.isFractional}
                            onChange={(quantity) => updateLine(line.key, { quantity })}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            inputMode="decimal"
                            className="h-7 w-11 px-0.5 text-xs text-center border-slate-200 dark:border-slate-800 focus-visible:ring-1 focus-visible:ring-indigo-500 mx-auto"
                            value={line.soldPrice}
                            disabled={!line.isOpenItem && !can.changePrice}
                            aria-invalid={D(line.soldPrice).lte(0)}
                            onChange={(e) => updateLine(line.key, { soldPrice: e.target.value })}
                            onBlur={() => {
                              if (D(line.soldPrice).lte(0) && line.cataloguePrice) {
                                updateLine(line.key, { soldPrice: line.cataloguePrice });
                              }
                            }}
                            aria-label={`${line.name} price`}
                          />
                        </TableCell>
                        <TableCell className="text-right text-xs font-semibold text-slate-700 dark:text-slate-300">
                          <MoneyDisplay
                            value={D(line.soldPrice).mul(D(line.quantity)).toFixed(2)}
                            symbol={currencySymbol}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
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
                        <QtyStepper
                          value={line.quantity}
                          label={`${line.name} quantity`}
                          fractional={line.isFractional}
                          onChange={(quantity) => updateLine(line.key, { quantity })}
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider">Price</span>
                        <Input
                          inputMode="decimal"
                          className="h-7 w-20 text-xs text-center px-1"
                          value={line.soldPrice}
                          disabled={!line.isOpenItem && !can.changePrice}
                          aria-invalid={D(line.soldPrice).lte(0)}
                          onChange={(e) => updateLine(line.key, { soldPrice: e.target.value })}
                          onBlur={() => {
                            if (D(line.soldPrice).lte(0) && line.cataloguePrice) {
                              updateLine(line.key, { soldPrice: line.cataloguePrice });
                            }
                          }}
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
        <div className={cn("rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 shadow-sm flex flex-col space-y-3 max-h-[640px] overflow-hidden", activeTab === "CART" ? "hidden md:flex" : "flex")}>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wide">Rate List Grid</h3>
            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-muted-foreground">
              {filteredProducts.length} items
            </span>
          </div>

          {/* Category Tabs */}
          {categories.length > 0 && (
            <div className="flex gap-1 overflow-x-auto pb-1.5 scrollbar-thin text-[10px] border-b border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  "rounded-full px-2.5 py-0.5 font-semibold transition-all duration-200 border whitespace-nowrap",
                  selectedCategory === null
                    ? "bg-slate-800 border-slate-800 text-white dark:bg-slate-200 dark:border-slate-200 dark:text-slate-900"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
                )}
              >
                Sab (All)
              </button>
              {categories.map((c, index) => {
                const colors = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
                const isActive = selectedCategory === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCategory(c.id)}
                    className={cn(
                      "rounded-full px-2.5 py-0.5 font-semibold transition-all duration-200 border whitespace-nowrap",
                      isActive ? colors.active : colors.inactive
                    )}
                  >
                    {c.name}
                  </button>
                );
              })}
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
                  const categoryIndex = p.categoryId ? categories.findIndex((cat) => cat.id === p.categoryId) : -1;
                  const accentClass = categoryIndex >= 0 ? ACCENT_COLORS[categoryIndex % ACCENT_COLORS.length] : "border-l-slate-350 dark:border-l-slate-600";
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        addProduct(p);
                        focusSearch();
                      }}
                      className={cn(
                        "flex flex-col text-left p-2.5 rounded-lg border border-l-4 transition-all duration-200 ease-out text-xs relative group hover:-translate-y-0.5 hover:shadow-md",
                        accentClass,
                        qty > 0
                          ? "border-indigo-300 bg-indigo-50/50 dark:border-indigo-900/50 dark:bg-indigo-950/20 shadow-sm"
                          : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
                      )}
                    >
                      {qty > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white rounded-full text-[9px] font-bold h-4.5 min-w-4.5 px-1.5 flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-md animate-scale-in">
                          {qty}
                        </span>
                      )}
                      <span className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-2 h-7 leading-tight mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {p.name}
                      </span>
                      <div className="mt-auto flex items-baseline justify-between w-full">
                        <span className="text-[9px] text-muted-foreground font-medium">
                          {p.unitName ?? "pcs"}
                        </span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">
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
        <div className="rounded-xl border border-slate-200/80 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-3">
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

          <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 p-4 border border-slate-100 dark:border-slate-800/60 mt-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Total Amount</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block">incl. all taxes & discounts</span>
            </div>
            <div className="text-right">
              <MoneyDisplay
                value={totals.grand.toFixed(2)}
                symbol={currencySymbol}
                className="text-2xl font-extrabold tracking-tight text-indigo-600 dark:text-indigo-400"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
          <div className="grid gap-1.5">
            <Label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Payment method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="h-9 border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-indigo-500 text-xs sm:text-sm">
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
            <Label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Received now</Label>
            <Input
              ref={receivedInputRef}
              inputMode="decimal"
              className="h-9 border-slate-200 dark:border-slate-800 focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs sm:text-sm font-semibold"
              value={paidTouched ? amountPaid : totals.grand.toFixed(2)}
              onChange={(e) => {
                setPaidTouched(true);
                setAmountPaid(e.target.value);
              }}
              aria-label="Amount received"
            />
            {paidTouched && lines.length > 0 && !effectivePaid.eq(totals.grand) && (
              <div className="flex items-center justify-between gap-2 rounded-md bg-slate-50 dark:bg-slate-900 border p-2 text-xs">
                <span>
                  Received {formatMoney(effectivePaid.toFixed(2), currencySymbol)} ≠ Total{" "}
                  {formatMoney(totals.grand.toFixed(2), currencySymbol)}
                  {effectivePaid.lt(totals.grand)
                    ? ` — farq ${formatMoney(amountDue.toFixed(2), currencySymbol)} udhaar banega`
                    : " — zyada amount, change wapas karein"}
                </span>
                <Button variant="outline" size="sm" className="h-6 px-2 text-xs shrink-0" onClick={resetPaid}>
                  = Total
                </Button>
              </div>
            )}
          </div>

          {paymentMethod === "CASH" && !isUdhaar && (
            <div className="grid gap-1.5">
              <Label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cash tendered (optional)</Label>
              <Input
                inputMode="decimal"
                className="h-9 border-slate-200 dark:border-slate-800 focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs sm:text-sm"
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

          <div className="pt-2 space-y-2">
            <Button
              className={cn(
                "w-full font-bold tracking-wide transition-all duration-200 py-6 text-sm",
                lines.length > 0
                  ? "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 hover:scale-[1.01] active:scale-[0.99]"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed"
              )}
              size="lg"
              onClick={submit}
              disabled={saving || !lines.length}
            >
              {saving ? "Saving…" : `Complete Bill · ${formatMoney(totals.grand.toFixed(2), currencySymbol)}`}
            </Button>
            {quotationsEnabled && !sourceQuotation && (
              <Button
                variant="outline"
                className="w-full border-slate-200 hover:bg-slate-50 text-slate-700 dark:border-slate-800 dark:text-slate-350 dark:hover:bg-slate-800 transition-colors font-medium text-xs py-5"
                disabled={saving || !lines.length}
                onClick={() => setQuotationDialog(true)}
              >
                <FileClock className="h-4 w-4 mr-1.5 text-indigo-500" /> Save as Quotation
              </Button>
            )}
          </div>
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

    {/* ── Success dialog — explicit buttons are the only way out, so an
         accidental backdrop click can't wipe the receipt ── */}
      <Dialog open={!!receipt} onOpenChange={(open) => !open && resetBill()}>
        <DialogContent
          className="sm:max-w-sm"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
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
              <div className="space-y-2 pt-2">
                <Button
                  className="w-full"
                  autoFocus
                  onClick={() => window.open(`/bills/${receipt.saleId}/print`, "_blank")}
                >
                  <Printer className="h-4 w-4 mr-1" /> Print Receipt
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" asChild>
                    <Link href={`/bills/${receipt.saleId}`}>View Bill</Link>
                  </Button>
                  <Button variant="secondary" onClick={resetBill}>
                    <Plus className="h-4 w-4 mr-1" /> New Bill
                  </Button>
                </div>
                <Button variant="ghost" className="w-full" onClick={resetBill}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Save-as-quotation dialog ── */}
      <Dialog open={quotationDialog} onOpenChange={(o) => !o && setQuotationDialog(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Save as Quotation</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Quotation bill nahi hoti — koi payment ya khata entry nahi banegi. Customer optional
              hai (payment panel se select karein).
            </p>
            <div className="grid gap-1.5">
              <Label>Validity (din)</Label>
              <Input
                inputMode="numeric"
                value={validityDays}
                onChange={(e) => setValidityDays(e.target.value)}
                placeholder={String(defaultValidityDays)}
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Estimated Total</span>
              <MoneyDisplay value={totals.grand.toFixed(2)} symbol={currencySymbol} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setQuotationDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveQuotation} disabled={saving}>
              {saving ? "Saving…" : "Save Quotation"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Quotation success dialog ── */}
      <Dialog open={!!quotationReceipt} onOpenChange={(open) => !open && resetBill()}>
        <DialogContent
          className="sm:max-w-sm"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Quotation ban gayi
            </DialogTitle>
          </DialogHeader>
          {quotationReceipt && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Quotation</span>
                <span className="font-mono font-medium">{quotationReceipt.quotationNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estimated Total</span>
                <MoneyDisplay value={quotationReceipt.grandTotal} symbol={currencySymbol} />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valid till</span>
                <span>{formatDate(quotationReceipt.validUntil)}</span>
              </div>
              <div className="space-y-2 pt-2">
                <Button
                  className="w-full"
                  autoFocus
                  onClick={() =>
                    window.open(`/quotations/${quotationReceipt.quotationId}/print`, "_blank")
                  }
                >
                  <Printer className="h-4 w-4 mr-1" /> Print Quotation
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" asChild>
                    <Link href={`/quotations/${quotationReceipt.quotationId}`}>View</Link>
                  </Button>
                  <Button variant="secondary" onClick={resetBill}>
                    <Plus className="h-4 w-4 mr-1" /> New Bill
                  </Button>
                </div>
                <Button variant="ghost" className="w-full" onClick={resetBill}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Product search box ───────────────────────────────────────

function ProductSearch({
  query,
  onQueryChange,
  preloaded,
  openItemMode,
  onOpenItemModeChange,
  onPick,
  onOpenItem,
  inputRef,
  onRequestFocus,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  preloaded: ProductHit[];
  openItemMode: boolean;
  onOpenItemModeChange: (open: boolean) => void;
  onPick: (p: ProductHit) => void;
  onOpenItem: (name: string, price: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onRequestFocus: () => void;
}) {
  // Server results are tagged with the query they answer; anything tagged
  // with an older query is simply ignored at merge time — no invalidation.
  const [serverResults, setServerResults] = useState<{ q: string; hits: ProductHit[] }>({
    q: "",
    hits: [],
  });
  const [highlight, setHighlight] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [openPrice, setOpenPrice] = useState("");

  useEffect(() => {
    inputRef.current?.focus();
  }, [inputRef, openItemMode]);

  // Instant matches from the preloaded catalogue slice.
  const localHits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return preloaded
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.barcode && p.barcode.includes(query.trim()))
      )
      .slice(0, 8);
  }, [preloaded, query]);

  // Debounced server search surfaces products beyond the preloaded slice.
  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    const t = setTimeout(async () => {
      const results = await searchProductsAction(q);
      setServerResults({ q, hits: results });
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  const merged = useMemo(() => {
    const fresh = serverResults.q === query.trim() ? serverResults.hits : [];
    const seen = new Set(localHits.map((h) => h.id));
    return [...localHits, ...fresh.filter((h) => !seen.has(h.id))].slice(0, 12);
  }, [localHits, serverResults, query]);

  const open = !openItemMode && !dismissed && query.trim() !== "";

  const setQuery = (value: string) => {
    onQueryChange(value);
    setDismissed(false);
    setHighlight(0);
  };

  const pick = (p: ProductHit) => {
    onPick(p);
    setQuery("");
    onRequestFocus();
  };

  const findExact = (list: ProductHit[], q: string) => {
    const lower = q.toLowerCase();
    return list.find((p) => p.barcode === q || p.sku?.toLowerCase() === lower);
  };

  /**
   * Scanner-safe Enter: exact local match adds synchronously; otherwise the
   * debounce is cancelled and the server is asked immediately, so a scanner's
   * trailing Enter can never act on an empty or stale list.
   */
  const handleEnter = async () => {
    const q = query.trim();
    if (!q) return;
    const exactLocal = findExact(preloaded, q);
    if (exactLocal) {
      pick(exactLocal);
      return;
    }
    if (merged[highlight]) {
      pick(merged[highlight]);
      return;
    }
    // Skip the debounce — a scanner's trailing Enter must resolve now.
    const results = await searchProductsAction(q);
    const exact = findExact(results, q);
    if (exact || results.length === 1) {
      pick(exact ?? results[0]);
      return;
    }
    setServerResults({ q, hits: results });
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
    onOpenItemModeChange(false);
    onRequestFocus();
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            className="pl-9 h-11 text-sm sm:text-base focus-visible:ring-2"
            placeholder="Search product, SKU, barcode..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (openItemMode) {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitOpenItem();
                }
                return;
              }
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlight((h) => Math.min(h + 1, merged.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlight((h) => Math.max(h - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                void handleEnter();
              } else if (e.key === "Escape") {
                setDismissed(true);
              }
            }}
            aria-label="Product search"
          />
        </div>
        {openItemMode ? (
          <>
            <Input
              inputMode="decimal"
              className="w-28 h-11 text-sm sm:text-base"
              placeholder="Price"
              value={openPrice}
              onChange={(e) => setOpenPrice(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitOpenItem()}
              aria-label="Open item price"
            />
            <Button onClick={submitOpenItem} className="h-11 px-4 font-bold">Add</Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 shrink-0"
              onClick={() => onOpenItemModeChange(false)}
              aria-label="Cancel open item"
            >
              <X className="h-5 w-5" />
            </Button>
          </>
        ) : (
          <Button variant="outline" onClick={() => onOpenItemModeChange(true)} className="h-11 px-4 font-bold">
            <Plus className="h-4 w-4 mr-1.5" /> Open Item
          </Button>
        )}
      </div>

      {open && (
        <div className="absolute z-20 mt-1.5 w-full rounded-lg border bg-popover shadow-lg max-h-80 overflow-y-auto">
          {merged.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              Koi product nahi mila. &ldquo;Open Item&rdquo; use karein.
            </div>
          ) : (
            merged.map((p, i) => (
              <button
                key={p.id}
                type="button"
                className={cn(
                  "flex w-full items-center justify-between px-4 py-3.5 text-left text-sm hover:bg-accent transition-colors",
                  i === highlight && "bg-accent"
                )}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => pick(p)}
              >
                <span className="flex flex-col">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{p.name}</span>
                  {p.sku && <span className="text-[10px] text-muted-foreground mt-0.5">SKU: {p.sku}</span>}
                </span>
                <MoneyDisplay value={p.salePrice} className="font-bold text-slate-900" />
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
                  <div className="px-2 py-2 space-y-2">
                    <p className="text-sm text-muted-foreground">Koi customer nahi mila.</p>
                    {canAdd && query.trim() && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="w-full justify-start text-xs h-7"
                        onClick={() => {
                          setNewName(query.trim());
                          setAdding(true);
                        }}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> &quot;{query.trim()}&quot; ko quick add karein
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {canAdd && (
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    onClick={() => {
                      setNewName(query.trim());
                      setAdding(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Naya customer
                  </Button>
                )}
                <Button size="sm" variant="ghost" type="button" onClick={() => setOpen(false)}>
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

// ── Quantity stepper ─────────────────────────────────────────

function QtyStepper({
  value,
  onChange,
  label,
  fractional = false,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  /** Weight/loose units: ±0.5 steps, 0.25 minimum, quick-set chips. */
  fractional?: boolean;
}) {
  const stepSize = fractional ? 0.5 : 1;
  const min = fractional ? 0.25 : 1;

  const step = (delta: number) => {
    const next = D(value).add(delta);
    onChange(next.lt(min) ? String(min) : next.toDecimalPlaces(3).toString());
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-7 w-7 rounded-full border-slate-200 dark:border-slate-800 hover:bg-slate-100 hover:text-indigo-650 dark:hover:bg-slate-800 transition-all duration-150 active:scale-90"
          onClick={() => step(-stepSize)}
          disabled={D(value).lte(min)}
          aria-label={`Decrease ${label}`}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <Input
          inputMode="decimal"
          className="h-7 w-9 px-0.5 text-[11px] text-center font-bold focus-visible:ring-1 focus-visible:ring-indigo-500 rounded-md border-slate-200 dark:border-slate-800"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => {
            const v = D(value);
            if (v.lte(0)) onChange(String(min));
            else if (fractional) onChange(v.toDecimalPlaces(3).toString());
            else onChange(v.toDecimalPlaces(0).toString());
          }}
          aria-label={label}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-7 w-7 rounded-full border-slate-200 dark:border-slate-800 hover:bg-slate-100 hover:text-indigo-650 dark:hover:bg-slate-800 transition-all duration-150 active:scale-90"
          onClick={() => step(stepSize)}
          aria-label={`Increase ${label}`}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      {fractional && (
        <div className="flex gap-1.5 pt-0.5">
          {[
            ["0.25", "¼"],
            ["0.5", "½"],
            ["1", "1"],
            ["2", "2"],
          ].map(([qty, chipLabel]) => (
            <button
              key={qty}
              type="button"
              onClick={() => onChange(qty)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-bold leading-none transition-all duration-150 active:scale-95",
                value === qty
                  ? "border-indigo-400 bg-indigo-50 text-indigo-750 font-extrabold dark:bg-indigo-950/40"
                  : "border-slate-200 text-slate-650 hover:bg-slate-50 dark:border-slate-700"
              )}
              aria-label={`Set ${label} to ${qty}`}
            >
              {chipLabel}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
