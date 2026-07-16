import "server-only";
import { db } from "@/server/db";
import { requirePermission } from "@/server/auth/guards";
import Decimal from "decimal.js";

export async function getStaffList() {
  const ctx = await requirePermission("VIEW_REPORTS", { read: true });

  const staff = await db.staff.findMany({
    where: { businessId: ctx.business.id },
    orderBy: { createdAt: "desc" },
    include: {
      attendance: {
        orderBy: { date: "desc" },
        take: 30,
      },
      transactions: {
        orderBy: { date: "desc" },
        take: 30,
      },
    },
  });

  return staff.map((s) => {
    // Calculate net advance (advances minus salary payments / deductions)
    let netAdvance = new Decimal(0);
    s.transactions.forEach((t) => {
      const val = new Decimal(t.amount.toString());
      if (t.type === "ADVANCE") {
        netAdvance = netAdvance.plus(val);
      } else if (t.type === "SALARY_PAYMENT" || t.type === "DEDUCTION") {
        netAdvance = netAdvance.minus(val);
      }
    });

    return {
      id: s.id,
      name: s.name,
      phone: s.phone,
      salary: s.salary.toString(),
      salaryType: s.salaryType,
      status: s.status,
      netAdvance: netAdvance.toString(),
      recentAttendance: s.attendance.map((a) => ({
        id: a.id,
        date: a.date.toISOString(),
        status: a.status,
        notes: a.notes,
      })),
      recentTransactions: s.transactions.map((t) => ({
        id: t.id,
        amount: t.amount.toString(),
        type: t.type,
        description: t.description,
        date: t.date.toISOString(),
      })),
    };
  });
}

export async function createStaff(input: {
  name: string;
  phone?: string;
  salary: string;
  salaryType: string; // "DAILY" | "WEEKLY" | "MONTHLY"
}) {
  const ctx = await requirePermission("MANAGE_SETTINGS");

  const salaryVal = parseFloat(input.salary);
  if (isNaN(salaryVal) || salaryVal < 0) {
    throw new Error("Salary cannot be negative.");
  }

  const staff = await db.staff.create({
    data: {
      businessId: ctx.business.id,
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      salary: new Decimal(input.salary),
      salaryType: input.salaryType,
    },
  });

  await db.auditLog.create({
    data: {
      businessId: ctx.business.id,
      userId: ctx.user.id,
      action: "STAFF_CREATED",
      entityType: "Staff",
      entityId: staff.id,
      metadata: { name: input.name },
    },
  });

  return staff;
}

export async function deleteStaff(id: string) {
  const ctx = await requirePermission("MANAGE_SETTINGS");

  const deleted = await db.staff.delete({
    where: {
      id,
      businessId: ctx.business.id,
    },
  });

  await db.auditLog.create({
    data: {
      businessId: ctx.business.id,
      userId: ctx.user.id,
      action: "STAFF_DELETED",
      entityType: "Staff",
      entityId: id,
    },
  });

  return deleted;
}

export async function markAttendance(input: {
  staffId: string;
  date: string; // "YYYY-MM-DD"
  status: "PRESENT" | "HALF_DAY" | "ABSENT" | "LEAVE";
  notes?: string;
}) {
  const ctx = await requirePermission("MANAGE_SETTINGS");

  const targetDate = new Date(input.date);
  targetDate.setHours(0, 0, 0, 0);

  // Check if staff belongs to tenant
  const staff = await db.staff.findFirst({
    where: { id: input.staffId, businessId: ctx.business.id },
  });
  if (!staff) throw new Error("Staff worker not found");

  const att = await db.staffAttendance.upsert({
    where: {
      staffId_date: {
        staffId: input.staffId,
        date: targetDate,
      },
    },
    update: {
      status: input.status,
      notes: input.notes?.trim() || null,
    },
    create: {
      staffId: input.staffId,
      date: targetDate,
      status: input.status,
      notes: input.notes?.trim() || null,
    },
  });

  return att;
}

export async function createStaffTransaction(input: {
  staffId: string;
  amount: string;
  type: "ADVANCE" | "SALARY_PAYMENT" | "BONUS" | "DEDUCTION";
  description?: string;
  date?: string;
}) {
  const ctx = await requirePermission("MANAGE_SETTINGS");

  const amountVal = parseFloat(input.amount);
  if (isNaN(amountVal) || amountVal <= 0) {
    throw new Error("Amount must be greater than zero");
  }

  // Check staff tenant
  const staff = await db.staff.findFirst({
    where: { id: input.staffId, businessId: ctx.business.id },
  });
  if (!staff) throw new Error("Staff worker not found");

  const targetDate = input.date ? new Date(input.date) : new Date();

  const tx = await db.staffTransaction.create({
    data: {
      staffId: input.staffId,
      amount: new Decimal(input.amount),
      type: input.type,
      description: input.description?.trim() || null,
      date: targetDate,
    },
  });

  await db.auditLog.create({
    data: {
      businessId: ctx.business.id,
      userId: ctx.user.id,
      action: "STAFF_TRANSACTION_CREATED",
      entityType: "StaffTransaction",
      entityId: tx.id,
      metadata: { staffId: input.staffId, amount: input.amount, type: input.type },
    },
  });

  return tx;
}
