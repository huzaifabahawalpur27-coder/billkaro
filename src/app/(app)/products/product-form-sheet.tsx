"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  saveProductAction,
  createBrandAction,
  createCategoryAction,
  createUnitAction,
  type ActionResult,
} from "./actions";
import type { ProductRow, Option } from "./products-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NONE = "__none__";
const ADD_NEW = "__add_new__";

/**
 * Select with inline "+ Add New" creation — used for Brand, Category, Unit
 * so the shopkeeper never leaves the product form.
 */
function CreatableSelect({
  label,
  name,
  options,
  defaultValue,
  onCreate,
}: {
  label: string;
  name: string;
  options: Option[];
  defaultValue: string | null;
  onCreate: (name: string) => Promise<ActionResult<Option>>;
}) {
  const [createdOptions, setCreatedOptions] = useState<Option[]>([]);
  const [value, setValue] = useState(defaultValue ?? NONE);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [pending, startTransition] = useTransition();

  // Server options merged with any created in this session (revalidation
  // will eventually deliver them via props).
  const localOptions = [
    ...options,
    ...createdOptions.filter((c) => !options.some((o) => o.id === c.id)),
  ];

  function handleCreate() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const result = await onCreate(trimmed);
      if (result.ok && result.data) {
        const created = result.data;
        setCreatedOptions((prev) =>
          prev.some((o) => o.id === created.id) ? prev : [...prev, created]
        );
        setValue(created.id);
        setAdding(false);
        setNewName("");
        toast.success(`${label} "${created.name}" add ho gaya.`);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <input type="hidden" name={name} value={value === NONE ? "" : value} />
      {adding ? (
        <div className="flex gap-2">
          <Input
            autoFocus
            value={newName}
            placeholder={`New ${label.toLowerCase()} name`}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreate();
              }
              if (e.key === "Escape") setAdding(false);
            }}
          />
          <Button type="button" size="sm" onClick={handleCreate} disabled={pending}>
            {pending ? "..." : "Add"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <Select
          value={value}
          onValueChange={(v) => {
            if (v === ADD_NEW) {
              setAdding(true);
            } else {
              setValue(v);
            }
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>—</SelectItem>
            {localOptions.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.name}
              </SelectItem>
            ))}
            <SelectItem value={ADD_NEW} className="text-indigo-600">
              <Plus className="size-3.5" /> Add New {label}
            </SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

export function ProductFormSheet({
  open,
  onOpenChange,
  product,
  brands,
  categories,
  units,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductRow | null;
  brands: Option[];
  categories: Option[];
  units: Option[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await saveProductAction({ ok: false, error: null }, formData);
      if (result.ok) {
        toast.success(product ? "Product update ho gaya." : "Product add ho gaya.");
        setError(null);
        onOpenChange(false);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{product ? "Edit Product" : "Add Product"}</SheetTitle>
        </SheetHeader>
        <form key={product?.id ?? "new"} onSubmit={handleSubmit} className="space-y-4 px-4 pb-6">
          <input type="hidden" name="id" value={product?.id ?? ""} />

          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Basic Details
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-name">Product Name *</Label>
            <Input
              id="p-name"
              name="name"
              defaultValue={product?.name ?? ""}
              placeholder="e.g. Surf Excel 1kg"
              required
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-sale">Sale Price (Rs.) *</Label>
            <Input
              id="p-sale"
              name="salePrice"
              inputMode="decimal"
              defaultValue={product?.salePrice ?? ""}
              placeholder="580"
              required
            />
          </div>
          <CreatableSelect
            label="Brand"
            name="brandId"
            options={brands}
            defaultValue={product?.brandId ?? null}
            onCreate={createBrandAction}
          />
          <CreatableSelect
            label="Category"
            name="categoryId"
            options={categories}
            defaultValue={product?.categoryId ?? null}
            onCreate={createCategoryAction}
          />
          <CreatableSelect
            label="Unit"
            name="unitId"
            options={units}
            defaultValue={product?.unitId ?? null}
            onCreate={createUnitAction}
          />

          <div className="pt-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Additional Details
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-sku">SKU</Label>
              <Input id="p-sku" name="sku" defaultValue={product?.sku ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-barcode">Barcode</Label>
              <Input id="p-barcode" name="barcode" defaultValue={product?.barcode ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-purchase">Purchase Price</Label>
              <Input
                id="p-purchase"
                name="purchasePrice"
                inputMode="decimal"
                defaultValue={product?.purchasePrice ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-wholesale">Wholesale Price</Label>
              <Input
                id="p-wholesale"
                name="wholesalePrice"
                inputMode="decimal"
                defaultValue={product?.wholesalePrice ?? ""}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select name="status" defaultValue={product?.status ?? "ACTIVE"}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Saving..." : product ? "Save Changes" : "Add Product"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
