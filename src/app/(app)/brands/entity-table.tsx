"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Tags } from "lucide-react";
import { toast } from "sonner";
import type { ActionResult } from "./actions";
import { EmptyState } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { formatDate } from "@/lib/format";

export interface EntityRow {
  id: string;
  name: string;
  productCount: number;
  lastPriceUpdate?: string | null;
}

interface EntityTableProps {
  entityLabel: string; // "Brand" | "Category"
  rows: EntityRow[];
  showLastUpdate?: boolean;
  canManage: boolean;
  onAdd: (name: string) => Promise<ActionResult>;
  onRename: (id: string, name: string) => Promise<ActionResult>;
  onDelete: (id: string) => Promise<ActionResult>;
  /** Optional extra action cell (e.g. Update Prices for brands). */
  extraAction?: (row: EntityRow) => React.ReactNode;
}

export function EntityTable({
  entityLabel,
  rows,
  showLastUpdate,
  canManage,
  onAdd,
  onRename,
  onDelete,
  extraAction,
}: EntityTableProps) {
  const [dialog, setDialog] = useState<{ mode: "add" | "rename"; row?: EntityRow } | null>(null);
  const [deleting, setDeleting] = useState<EntityRow | null>(null);
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  function submitDialog() {
    if (!dialog) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const result =
        dialog.mode === "add" ? await onAdd(trimmed) : await onRename(dialog.row!.id, trimmed);
      if (result.ok) {
        toast.success(
          dialog.mode === "add"
            ? `${entityLabel} add ho gaya.`
            : `${entityLabel} rename ho gaya.`
        );
        setDialog(null);
        setName("");
      } else {
        toast.error(result.error);
      }
    });
  }

  function confirmDelete() {
    if (!deleting) return;
    const row = deleting;
    startTransition(async () => {
      const result = await onDelete(row.id);
      if (result.ok) toast.success(`"${row.name}" delete ho gaya.`);
      else toast.error(result.error);
      setDeleting(null);
    });
  }

  return (
    <div className="space-y-3">
      {canManage && (
        <div className="flex justify-end">
          <Button
            onClick={() => {
              setName("");
              setDialog({ mode: "add" });
            }}
          >
            <Plus className="size-4" />
            Add {entityLabel}
          </Button>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={Tags}
          title={`No ${entityLabel.toLowerCase()}s yet`}
          description={`Pehla ${entityLabel.toLowerCase()} add karein — ya product form ke andar bhi bana sakte hain.`}
        />
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{entityLabel}</TableHead>
                <TableHead className="text-right">Products</TableHead>
                {showLastUpdate && <TableHead>Last Price Update</TableHead>}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium text-slate-900">{row.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.productCount}</TableCell>
                  {showLastUpdate && (
                    <TableCell className="text-slate-600">
                      {row.lastPriceUpdate ? formatDate(row.lastPriceUpdate) : "—"}
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {extraAction?.(row)}
                      {canManage && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            title="Rename"
                            onClick={() => {
                              setName(row.name);
                              setDialog({ mode: "rename", row });
                            }}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-slate-400 hover:text-red-600"
                            title="Delete"
                            onClick={() => setDeleting(row)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add / Rename dialog */}
      <Dialog open={!!dialog} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {dialog?.mode === "add" ? `Add ${entityLabel}` : `Rename ${entityLabel}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="entity-name">{entityLabel} Name</Label>
              <Input
                id="entity-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitDialog()}
              />
            </div>
            <Button className="w-full" onClick={submitDialog} disabled={pending}>
              {pending ? "Saving..." : dialog?.mode === "add" ? `Add ${entityLabel}` : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {entityLabel.toLowerCase()}?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleting?.name}&quot; delete ho jayega. Yeh sirf tab mumkin hai jab is ke
              products na hon.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={pending}
              className="bg-red-600 hover:bg-red-700"
            >
              {pending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
