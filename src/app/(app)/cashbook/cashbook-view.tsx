"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Minus, Trash2 } from "lucide-react";
import { createCashBookEntryAction, deleteCashBookEntryAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Entry {
  id: string;
  amount: string;
  type: "CASH_IN" | "CASH_OUT";
  description: string;
  createdAt: string;
}

interface CashBookViewProps {
  initialData: {
    entries: Entry[];
    totalIn: string;
    totalOut: string;
    netCash: string;
  };
  currencySymbol: string;
  language: string;
}

export function CashBookView({
  initialData,
  currencySymbol,
  language,
}: CashBookViewProps) {
  const [data, setData] = useState(initialData);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [entryType, setEntryType] = useState<"CASH_IN" | "CASH_OUT">("CASH_IN");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [pending, startTransition] = useTransition();

  const isUrdu = language === "ur";

  function handleOpenDialog(type: "CASH_IN" | "CASH_OUT") {
    setEntryType(type);
    setAmount("");
    setDescription("");
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createCashBookEntryAction({
        amount,
        type: entryType,
        description,
      });

      if (result.ok) {
        toast.success(isUrdu ? "Entry save ho gayi!" : "Entry successfully saved!");
        setDialogOpen(false);
        // Optimistically reload window/route
        window.location.reload();
      } else {
        toast.error(result.error || "Save nahi ho saki.");
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm(isUrdu ? "Kya aap yeh entry delete karna chahte hain?" : "Are you sure you want to delete this entry?")) {
      return;
    }
    startTransition(async () => {
      const result = await deleteCashBookEntryAction(id);
      if (result.ok) {
        toast.success(isUrdu ? "Entry delete ho gayi." : "Entry deleted.");
        window.location.reload();
      } else {
        toast.error(result.error);
      }
    });
  }

  const netNum = parseFloat(data.netCash);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Net Cash */}
        <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            {isUrdu ? "خالص کیش (Net Shop Cash)" : "Net Cash Balance"}
          </span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xs text-muted-foreground">{currencySymbol}</span>
            <span className={`text-3xl font-extrabold ${netNum >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {netNum.toLocaleString("en-PK")}
            </span>
          </div>
          <span className="text-xs text-muted-foreground mt-1">
            {isUrdu ? "دکان کا مجموعی کیش بیلنس" : "Current cash register balance"}
          </span>
        </div>

        {/* Total In */}
        <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            {isUrdu ? "کیش آمد (Total Cash In)" : "Total Cash In"}
          </span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xs text-muted-foreground">{currencySymbol}</span>
            <span className="text-3xl font-extrabold text-emerald-600">
              {parseFloat(data.totalIn).toLocaleString("en-PK")}
            </span>
          </div>
          <span className="text-xs text-emerald-600 mt-1 flex items-center gap-1 font-medium">
            <Plus className="size-3" /> {isUrdu ? "کیش رجسٹر میں اضافہ" : "Additions to register"}
          </span>
        </div>

        {/* Total Out */}
        <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            {isUrdu ? "کیش اخراجات (Expenses / Cash Out)" : "Total Cash Out"}
          </span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xs text-muted-foreground">{currencySymbol}</span>
            <span className="text-3xl font-extrabold text-rose-600">
              {parseFloat(data.totalOut).toLocaleString("en-PK")}
            </span>
          </div>
          <span className="text-xs text-rose-600 mt-1 flex items-center gap-1 font-medium">
            <Minus className="size-3" /> {isUrdu ? "دکان کے روزمرہ اخراجات" : "Daily shop expenses"}
          </span>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 justify-end">
        <Button
          onClick={() => handleOpenDialog("CASH_IN")}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5 shadow-sm"
        >
          <Plus className="size-4" /> {isUrdu ? "کیش آمد شامل کریں" : "Add Cash In"}
        </Button>
        <Button
          onClick={() => handleOpenDialog("CASH_OUT")}
          variant="destructive"
          className="bg-rose-600 hover:bg-rose-700 text-white font-medium gap-1.5 shadow-sm"
        >
          <Minus className="size-4" /> {isUrdu ? "خرچہ (Cash Out) لکھیں" : "Record Expense"}
        </Button>
      </div>

      {/* Transactions Table */}
      <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                <th className="p-4">{isUrdu ? "تاریخ (Date)" : "Date"}</th>
                <th className="p-4">{isUrdu ? "تفصیل (Description)" : "Description"}</th>
                <th className="p-4">{isUrdu ? "ٹائپ (Type)" : "Type"}</th>
                <th className="p-4 text-right">{isUrdu ? "رقم (Amount)" : "Amount"}</th>
                <th className="p-4 text-center">{isUrdu ? "ایکشن (Action)" : "Action"}</th>
              </tr>
            </thead>
            <tbody className="divide-y text-slate-700">
              {data.entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    {isUrdu ? "کوئی ٹرانزیکشن نہیں ملی۔" : "No entries recorded yet."}
                  </td>
                </tr>
              ) : (
                data.entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-mono text-xs text-slate-500">
                      {new Date(entry.createdAt).toLocaleDateString("en-PK", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="p-4 font-medium text-slate-900">{entry.description}</td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide ${
                          entry.type === "CASH_IN"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {entry.type === "CASH_IN"
                          ? isUrdu
                            ? "کیش آمد"
                            : "Cash In"
                          : isUrdu
                          ? "کیش آؤٹ (خرچہ)"
                          : "Expense"}
                      </span>
                    </td>
                    <td className={`p-4 text-right font-mono font-bold text-base ${
                      entry.type === "CASH_IN" ? "text-emerald-600" : "text-rose-600"
                    }`}>
                      {entry.type === "CASH_OUT" ? "-" : "+"}
                      {currencySymbol} {parseFloat(entry.amount).toLocaleString("en-PK")}
                    </td>
                    <td className="p-4 text-center">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(entry.id)}
                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialog for Cash Book entry */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {entryType === "CASH_IN"
                  ? isUrdu
                    ? "نیا کیش آمد لکھیں"
                    : "Add Cash In"
                  : isUrdu
                  ? "نیا خرچہ (Cash Out) لکھیں"
                  : "Record Expense"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="entry-amount">
                  {isUrdu ? "رقم (Amount)" : "Amount"}
                </Label>
                <div className="relative">
                  <Input
                    id="entry-amount"
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="pl-8"
                    required
                    autoFocus
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-mono">
                    {currencySymbol}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="entry-desc">
                  {isUrdu ? "تفصیل (Description)" : "Description"}
                </Label>
                <Input
                  id="entry-desc"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    entryType === "CASH_IN"
                      ? isUrdu
                        ? "مثال: دراز سے نکالا، گلک، ادھار واپسی"
                        : "e.g., Opening drawer balance, custom sale"
                      : isUrdu
                      ? "مثال: چائے کا خرچہ، بجلی کا بل، دکان کا کرایہ"
                      : "e.g., Tea expense, electricity bill, shop rent"
                  }
                  required
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={pending}
              >
                {isUrdu ? "کینسل" : "Cancel"}
              </Button>
              <Button
                type="submit"
                disabled={pending}
                className={entryType === "CASH_IN" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}
              >
                {pending
                  ? isUrdu
                    ? "محفوظ ہو رہا ہے..."
                    : "Saving..."
                  : isUrdu
                  ? "محفوظ کریں"
                  : "Save Entry"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
