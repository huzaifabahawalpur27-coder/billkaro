"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Check, Calendar, ArrowUpRight, DollarSign, UserMinus } from "lucide-react";
import {
  createStaffAction,
  deleteStaffAction,
  markAttendanceAction,
  createStaffTransactionAction,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Attendance {
  id: string;
  date: string;
  status: string;
  notes?: string | null;
}

interface Transaction {
  id: string;
  amount: string;
  type: string;
  description?: string | null;
  date: string;
}

interface StaffWorker {
  id: string;
  name: string;
  phone?: string | null;
  salary: string;
  salaryType: string;
  status: string;
  netAdvance: string;
  recentAttendance: Attendance[];
  recentTransactions: Transaction[];
}

interface StaffViewProps {
  workers: StaffWorker[];
  currencySymbol: string;
  language: string;
}

export function StaffView({
  workers,
  currencySymbol,
  language,
}: StaffViewProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [attDialogOpen, setAttDialogOpen] = useState(false);
  const [txDialogOpen, setTxDialogOpen] = useState(false);

  // New Staff form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [salary, setSalary] = useState("");
  const [salaryType, setSalaryType] = useState("MONTHLY");

  // Attendance form
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [attDate, setAttDate] = useState(new Date().toISOString().split("T")[0]);
  const [attStatus, setAttStatus] = useState("PRESENT");
  const [attNotes, setAttNotes] = useState("");

  // Transaction form
  const [txWorkerId, setTxWorkerId] = useState("");
  const [txAmount, setTxAmount] = useState("");
  const [txType, setTxType] = useState("ADVANCE");
  const [txDesc, setTxDesc] = useState("");

  const [pending, startTransition] = useTransition();

  const isUrdu = language === "ur";

  function handleCreateStaff(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createStaffAction({
        name,
        phone,
        salary,
        salaryType,
      });

      if (result.ok) {
        toast.success(isUrdu ? "Staff register ho gaya!" : "Worker successfully registered!");
        setDialogOpen(false);
        window.location.reload();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleMarkAttendance(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await markAttendanceAction({
        staffId: selectedWorkerId,
        date: attDate,
        status: attStatus,
        notes: attNotes,
      });

      if (result.ok) {
        toast.success(isUrdu ? "Hazri save ho gayi!" : "Attendance saved successfully!");
        setAttDialogOpen(false);
        window.location.reload();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleCreateTransaction(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createStaffTransactionAction({
        staffId: txWorkerId,
        amount: txAmount,
        type: txType,
        description: txDesc,
      });

      if (result.ok) {
        toast.success(isUrdu ? "Raqam/Wage transaction update ho gayi!" : "Transaction successfully updated!");
        setTxDialogOpen(false);
        window.location.reload();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDeleteStaff(id: string) {
    if (!confirm(isUrdu ? "Kya aap is worker ko delete karna chahte hain?" : "Are you sure you want to delete this staff member?")) {
      return;
    }
    startTransition(async () => {
      const result = await deleteStaffAction(id);
      if (result.ok) {
        toast.success(isUrdu ? "Worker delete ho gaya." : "Worker deleted successfully.");
        window.location.reload();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Quick Buttons */}
      <div className="flex flex-wrap gap-3 justify-end">
        <Button onClick={() => setDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm gap-1.5">
          <Plus className="size-4" /> {isUrdu ? "نیا اسٹاف شامل کریں" : "Add Staff Worker"}
        </Button>
        <Button onClick={() => {
          if (workers.length > 0) setSelectedWorkerId(workers[0].id);
          setAttDialogOpen(true);
        }} variant="outline" className="border-indigo-600 text-indigo-700 hover:bg-indigo-50 font-medium gap-1.5 shadow-sm">
          <Calendar className="size-4" /> {isUrdu ? "حاضری لگائیں (Attendance)" : "Mark Attendance"}
        </Button>
        <Button onClick={() => {
          if (workers.length > 0) setTxWorkerId(workers[0].id);
          setTxDialogOpen(true);
        }} variant="outline" className="border-indigo-600 text-indigo-700 hover:bg-indigo-50 font-medium gap-1.5 shadow-sm">
          <DollarSign className="size-4" /> {isUrdu ? "پیشگی / تنخواہ (Peishgi/Salary)" : "Record Wages/Advances"}
        </Button>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workers.length === 0 ? (
          <div className="col-span-full border border-dashed rounded-xl p-12 text-center text-slate-400">
            {isUrdu ? "کوئی اسٹاف ممبر نہیں ملا۔" : "No staff members registered yet."}
          </div>
        ) : (
          workers.map((worker) => {
            const advNum = parseFloat(worker.netAdvance);
            return (
              <div key={worker.id} className="rounded-xl border bg-white shadow-sm overflow-hidden flex flex-col justify-between">
                <div className="p-6 space-y-4">
                  {/* Title & Phone */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{worker.name}</h3>
                      {worker.phone && <p className="text-xs text-slate-400 font-mono mt-0.5">{worker.phone}</p>}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteStaff(worker.id)}
                      className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full"
                    >
                      <UserMinus className="size-4" />
                    </Button>
                  </div>

                  {/* Salary Details */}
                  <div className="grid grid-cols-2 gap-4 text-sm border-y py-3 border-slate-100">
                    <div>
                      <span className="text-xs text-muted-foreground block">
                        {isUrdu ? "تنخواہ (Salary)" : "Salary"}
                      </span>
                      <span className="font-bold text-slate-800 font-mono">
                        {currencySymbol} {parseFloat(worker.salary).toLocaleString("en-PK")}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">
                        {isUrdu ? "ٹائپ (Cycle)" : "Cycle"}
                      </span>
                      <span className="font-medium text-slate-600">
                        {worker.salaryType === "DAILY"
                          ? isUrdu
                            ? "روزانہ"
                            : "Daily"
                          : worker.salaryType === "WEEKLY"
                          ? isUrdu
                            ? "ہفتہ وار"
                            : "Weekly"
                          : isUrdu
                          ? "ماہانہ"
                          : "Monthly"}
                      </span>
                    </div>
                  </div>

                  {/* Net Advance Peishgi */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-slate-600">
                      {isUrdu ? "پیشگی (Net Advance/Peishgi)" : "Net Advance"}
                    </span>
                    <span className={`font-bold font-mono text-base ${advNum > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                      {currencySymbol} {advNum.toLocaleString("en-PK")}
                    </span>
                  </div>
                </div>

                {/* Footer status summary / Recent Actions */}
                <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>
                      {isUrdu ? "آخری حاضری (Hazri)" : "Recent Attendance:"}
                    </span>
                    {worker.recentAttendance.length > 0 ? (
                      <span className="font-semibold text-slate-700">
                        {worker.recentAttendance[0].status === "PRESENT"
                          ? isUrdu
                            ? "حاضر (P)"
                            : "Present"
                          : worker.recentAttendance[0].status === "HALF_DAY"
                          ? isUrdu
                            ? "آدھا دن (HD)"
                            : "Half Day"
                          : worker.recentAttendance[0].status === "ABSENT"
                          ? isUrdu
                            ? "غیر حاضر (A)"
                            : "Absent"
                          : isUrdu
                          ? "رخصت (L)"
                          : "Leave"}
                      </span>
                    ) : (
                      <span>-</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Register Staff Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateStaff}>
            <DialogHeader>
              <DialogTitle>
                {isUrdu ? "نیا اسٹاف ورکر درج کریں" : "Register New Worker"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="staff-name">
                  {isUrdu ? "ورکر کا نام (Name)" : "Worker Name"}
                </Label>
                <Input
                  id="staff-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isUrdu ? "نام لکھیں" : "e.g., Ali Khan"}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="staff-phone">
                  {isUrdu ? "موبائل نمبر (Mobile)" : "Phone Number (Optional)"}
                </Label>
                <Input
                  id="staff-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="03XXXXXXXXX"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="staff-salary">
                    {isUrdu ? "تنخواہ / اجرت (Salary/Wage)" : "Salary/Wages"}
                  </Label>
                  <div className="relative">
                    <Input
                      id="staff-salary"
                      type="number"
                      value={salary}
                      onChange={(e) => setSalary(e.target.value)}
                      placeholder="0"
                      className="pl-8"
                      required
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-mono">
                      {currencySymbol}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="staff-cycle">
                    {isUrdu ? "اجرت کا چکر (Cycle)" : "Salary Cycle"}
                  </Label>
                  <select
                    id="staff-cycle"
                    value={salaryType}
                    onChange={(e) => setSalaryType(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="DAILY">{isUrdu ? "روزانہ (Daily)" : "Daily"}</option>
                    <option value="WEEKLY">{isUrdu ? "ہفتہ وار (Weekly)" : "Weekly"}</option>
                    <option value="MONTHLY">{isUrdu ? "ماہانہ (Monthly)" : "Monthly"}</option>
                  </select>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={pending}>
                {isUrdu ? "کینسل" : "Cancel"}
              </Button>
              <Button type="submit" disabled={pending} className="bg-indigo-600 hover:bg-indigo-700">
                {pending ? (isUrdu ? "محفوظ ہو رہا ہے..." : "Registering...") : (isUrdu ? "محفوظ کریں" : "Register Worker")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Attendance Dialog */}
      <Dialog open={attDialogOpen} onOpenChange={setAttDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleMarkAttendance}>
            <DialogHeader>
              <DialogTitle>
                {isUrdu ? "حاضری لگائیں (Attendance)" : "Mark Attendance"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="att-worker">
                  {isUrdu ? "ورکر منتخب کریں (Select Worker)" : "Select Worker"}
                </Label>
                <select
                  id="att-worker"
                  value={selectedWorkerId}
                  onChange={(e) => setSelectedWorkerId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                >
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="att-date">
                    {isUrdu ? "تاریخ (Date)" : "Date"}
                  </Label>
                  <Input
                    id="att-date"
                    type="date"
                    value={attDate}
                    onChange={(e) => setAttDate(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="att-status">
                    {isUrdu ? "حاضری کی حالت (Status)" : "Attendance Status"}
                  </Label>
                  <select
                    id="att-status"
                    value={attStatus}
                    onChange={(e) => setAttStatus(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    required
                  >
                    <option value="PRESENT">{isUrdu ? "حاضر (Present)" : "Present"}</option>
                    <option value="HALF_DAY">{isUrdu ? "آدھا دن (Half Day)" : "Half Day"}</option>
                    <option value="ABSENT">{isUrdu ? "غیر حاضر (Absent)" : "Absent"}</option>
                    <option value="LEAVE">{isUrdu ? "رخصت (Leave)" : "Leave"}</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="att-notes">
                  {isUrdu ? "نوٹ (Notes)" : "Notes (Optional)"}
                </Label>
                <Input
                  id="att-notes"
                  type="text"
                  value={attNotes}
                  onChange={(e) => setAttNotes(e.target.value)}
                  placeholder={isUrdu ? "دیر سے آنا، یا کوئی اور تفصیل" : "e.g., Arrived late, leave reason"}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAttDialogOpen(false)} disabled={pending}>
                {isUrdu ? "کینسل" : "Cancel"}
              </Button>
              <Button type="submit" disabled={pending} className="bg-indigo-600 hover:bg-indigo-700">
                {pending ? (isUrdu ? "محفوظ ہو رہا ہے..." : "Saving...") : (isUrdu ? "حاضری محفوظ کریں" : "Save Attendance")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transaction Advances Dialog */}
      <Dialog open={txDialogOpen} onOpenChange={setTxDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateTransaction}>
            <DialogHeader>
              <DialogTitle>
                {isUrdu ? "پیشگی یا اجرت کی ادائیگی" : "Advances & Wages"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="tx-worker">
                  {isUrdu ? "ورکر منتخب کریں (Select Worker)" : "Select Worker"}
                </Label>
                <select
                  id="tx-worker"
                  value={txWorkerId}
                  onChange={(e) => setTxWorkerId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                >
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="tx-amount">
                    {isUrdu ? "رقم (Amount)" : "Amount"}
                  </Label>
                  <div className="relative">
                    <Input
                      id="tx-amount"
                      type="number"
                      value={txAmount}
                      onChange={(e) => setTxAmount(e.target.value)}
                      placeholder="0"
                      className="pl-8"
                      required
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-mono">
                      {currencySymbol}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tx-type">
                    {isUrdu ? "ٹائپ (Transaction Type)" : "Type"}
                  </Label>
                  <select
                    id="tx-type"
                    value={txType}
                    onChange={(e) => setTxType(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    required
                  >
                    <option value="ADVANCE">{isUrdu ? "پیشگی ایڈوانس (Peishgi)" : "Peishgi (Advance)"}</option>
                    <option value="SALARY_PAYMENT">{isUrdu ? "تنخواہ کی ادائیگی" : "Salary Payment"}</option>
                    <option value="DEDUCTION">{isUrdu ? "کٹوتی (Deduction)" : "Deduction"}</option>
                    <option value="BONUS">{isUrdu ? "بونس (Bonus)" : "Bonus"}</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tx-desc">
                  {isUrdu ? "تفصیل (Description)" : "Description"}
                </Label>
                <Input
                  id="tx-desc"
                  type="text"
                  value={txDesc}
                  onChange={(e) => setTxDesc(e.target.value)}
                  placeholder={isUrdu ? "مثال: جولائی کی ہاف تنخواہ" : "e.g., Half payment of July wages"}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTxDialogOpen(false)} disabled={pending}>
                {isUrdu ? "کینسل" : "Cancel"}
              </Button>
              <Button type="submit" disabled={pending} className="bg-indigo-600 hover:bg-indigo-700">
                {pending ? (isUrdu ? "محفوظ ہو رہا ہے..." : "Saving...") : (isUrdu ? "ٹرانزیکشن محفوظ کریں" : "Record Wages")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
