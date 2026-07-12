"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Package, Plus, Search, MoreHorizontal, History, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteProductAction,
  inlinePriceAction,
  priceHistoryAction,
  type PriceHistoryRow,
} from "./actions";
import { ProductFormSheet } from "./product-form-sheet";
import { MoneyDisplay } from "@/components/app/money-display";
import { StatusBadge } from "@/components/app/status-badge";
import { EmptyState } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateTime, formatMoney } from "@/lib/format";

export interface ProductRow {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  brandId: string | null;
  brandName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  unitId: string | null;
  unitName: string | null;
  purchasePrice: string | null;
  salePrice: string;
  wholesalePrice: string | null;
  status: string;
}

export interface Option {
  id: string;
  name: string;
}

interface Can {
  add: boolean;
  edit: boolean;
  del: boolean;
  changePrice: boolean;
}

const ALL = "__all__";

export function ProductsView({
  rows,
  total,
  page,
  pageSize,
  brands,
  categories,
  units,
  can,
}: {
  rows: ProductRow[];
  total: number;
  page: number;
  pageSize: number;
  brands: Option[];
  categories: Option[];
  units: Option[];
  can: Can;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [deleting, setDeleting] = useState<ProductRow | null>(null);
  const [history, setHistory] = useState<{ productName: string; rows: PriceHistoryRow[] } | null>(null);
  const [pending, startTransition] = useTransition();

  // Debounced search
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== "page") params.delete("page");
    router.replace(`/products?${params.toString()}`);
  }

  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setParam("q", value || null), 300);
  }

  function handleDelete() {
    if (!deleting) return;
    const target = deleting;
    startTransition(async () => {
      const result = await deleteProductAction(target.id);
      if (result.ok) toast.success(`"${target.name}" delete ho gaya.`);
      else toast.error(result.error);
      setDeleting(null);
    });
  }

  function openHistory(row: ProductRow) {
    startTransition(async () => {
      const result = await priceHistoryAction(row.id);
      if (result.ok && result.data) setHistory(result.data);
      else toast.error(result.error);
    });
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const isFiltered = !!(searchParams.get("q") || searchParams.get("brand") || searchParams.get("category") || searchParams.get("status"));

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search product, SKU, or barcode..."
            className="pl-8"
          />
        </div>
        <Select
          value={searchParams.get("brand") ?? ALL}
          onValueChange={(v) => setParam("brand", v === ALL ? null : v)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Brand" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Brands</SelectItem>
            {brands.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={searchParams.get("category") ?? ALL}
          onValueChange={(v) => setParam("category", v === ALL ? null : v)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={searchParams.get("status") ?? ALL}
          onValueChange={(v) => setParam("status", v === ALL ? null : v)}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>
        {can.add && (
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" />
            Add Product
          </Button>
        )}
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <EmptyState
          icon={Package}
          title={isFiltered ? "No products found" : "No products yet"}
          description={
            isFiltered
              ? "Search ya filters tabdeel kar ke dekhein."
              : "Apni Excel product list import karein ya pehla product add karein."
          }
          actions={
            !isFiltered && can.add ? (
              <Button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="size-4" />
                Add Product
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Sale Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="font-medium text-slate-900">{row.name}</div>
                    {(row.sku || row.barcode) && (
                      <div className="text-xs text-slate-500">
                        {row.sku && <span>SKU: {row.sku}</span>}
                        {row.sku && row.barcode && <span> · </span>}
                        {row.barcode && <span>{row.barcode}</span>}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-600">{row.brandName ?? "—"}</TableCell>
                  <TableCell className="text-slate-600">{row.categoryName ?? "—"}</TableCell>
                  <TableCell className="text-slate-600">{row.unitName ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <InlinePrice row={row} canEdit={can.changePrice} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge kind={row.status === "ACTIVE" ? "active" : "inactive"}>
                      {row.status === "ACTIVE" ? "Active" : "Inactive"}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {can.edit && (
                          <DropdownMenuItem
                            onClick={() => {
                              setEditing(row);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil className="size-4" /> Edit
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => openHistory(row)}>
                          <History className="size-4" /> Price History
                        </DropdownMenuItem>
                        {can.del && (
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleting(row)}
                          >
                            <Trash2 className="size-4" /> Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            {total} products · Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setParamPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setParamPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Add / Edit sheet */}
      <ProductFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editing}
        brands={brands}
        categories={categories}
        units={units}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleting?.name}&quot; rate list se delete ho jayega. Purane bills par is ka
              record mehfooz rahega.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={pending}
              className="bg-red-600 hover:bg-red-700"
            >
              {pending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Price history dialog */}
      <Dialog open={!!history} onOpenChange={(open) => !open && setHistory(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Price History — {history?.productName}</DialogTitle>
          </DialogHeader>
          {history?.rows.length === 0 ? (
            <p className="py-4 text-sm text-slate-500">Abhi tak koi price change nahi hui.</p>
          ) : (
            <div className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Old</TableHead>
                    <TableHead className="text-right">New</TableHead>
                    <TableHead>By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history?.rows.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="text-xs">{formatDateTime(h.createdAt)}</TableCell>
                      <TableCell className="text-xs">{h.priceType}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {h.oldPrice ? formatMoney(h.oldPrice) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatMoney(h.newPrice)}
                      </TableCell>
                      <TableCell className="text-xs">{h.changedBy}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

  function setParamPage(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    router.replace(`/products?${params.toString()}`);
  }
}

/** Inline sale price editor (click to edit, Enter/blur to save). */
function InlinePrice({ row, canEdit }: { row: ProductRow; canEdit: boolean }) {
  const [editingValue, setEditingValue] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!canEdit) {
    return <MoneyDisplay value={row.salePrice} className="font-medium" />;
  }

  if (editingValue === null) {
    return (
      <button
        className="rounded px-1.5 py-0.5 font-medium tabular-nums hover:bg-indigo-50 hover:text-indigo-700"
        title="Click to edit price"
        onClick={() => setEditingValue(row.salePrice)}
      >
        {formatMoney(row.salePrice)}
      </button>
    );
  }

  function save() {
    const value = editingValue;
    setEditingValue(null);
    if (value === null || value === row.salePrice) return;
    startTransition(async () => {
      const result = await inlinePriceAction(row.id, value);
      if (result.ok) toast.success("Price update ho gayi.");
      else toast.error(result.error);
    });
  }

  return (
    <Input
      autoFocus
      inputMode="decimal"
      value={editingValue}
      disabled={pending}
      onChange={(e) => setEditingValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") save();
        if (e.key === "Escape") setEditingValue(null);
      }}
      className="ml-auto h-8 w-24 text-right tabular-nums"
    />
  );
}
