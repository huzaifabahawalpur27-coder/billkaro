"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createStaff,
  deleteStaff,
  markAttendance,
  createStaffTransaction,
} from "@/server/services/staff";

const staffSchema = z.object({
  name: z.string().trim().min(2, "Worker name is required."),
  phone: z.string().trim().optional(),
  salary: z.string().trim().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
    message: "Salary zero ya us se zyada ho.",
  }),
  salaryType: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
});

const attendanceSchema = z.object({
  staffId: z.string().trim().min(1),
  date: z.string().trim().min(1),
  status: z.enum(["PRESENT", "HALF_DAY", "ABSENT", "LEAVE"]),
  notes: z.string().trim().optional(),
});

const transactionSchema = z.object({
  staffId: z.string().trim().min(1),
  amount: z.string().trim().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Raqam sahi enter karein (0 se bari ho).",
  }),
  type: z.enum(["ADVANCE", "SALARY_PAYMENT", "BONUS", "DEDUCTION"]),
  description: z.string().trim().optional(),
});

export async function createStaffAction(raw: unknown) {
  const parsed = staffSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  try {
    await createStaff(parsed.data);
    revalidatePath("/staff");
    return { ok: true, error: null };
  } catch (err: any) {
    return { ok: false, error: err.message || "Staff register nahi ho saka." };
  }
}

export async function deleteStaffAction(id: string) {
  try {
    await deleteStaff(id);
    revalidatePath("/staff");
    return { ok: true, error: null };
  } catch (err: any) {
    return { ok: false, error: err.message || "Staff worker delete nahi ho saka." };
  }
}

export async function markAttendanceAction(raw: unknown) {
  const parsed = attendanceSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  try {
    await markAttendance(parsed.data);
    revalidatePath("/staff");
    return { ok: true, error: null };
  } catch (err: any) {
    return { ok: false, error: err.message || "Attendance save nahi ho saki." };
  }
}

export async function createStaffTransactionAction(raw: unknown) {
  const parsed = transactionSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  try {
    await createStaffTransaction(parsed.data);
    revalidatePath("/staff");
    return { ok: true, error: null };
  } catch (err: any) {
    return { ok: false, error: err.message || "Transaction update nahi ho saki." };
  }
}
