import "server-only";
import ExcelJS from "exceljs";
import { db } from "@/server/db";
import { requirePermission } from "@/server/auth/guards";
import { D } from "@/lib/money";

// ─────────────────────────────────────────────────────────────
// Products XLSX export
// ─────────────────────────────────────────────────────────────

export async function exportProductsXlsx(): Promise<Buffer> {
  const ctx = await requirePermission("IMPORT_EXPORT", { read: true });

  const products = await db.product.findMany({
    where: { businessId: ctx.business.id },
    include: {
      brand: { select: { name: true } },
      category: { select: { name: true } },
      unit: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "BillKaro";
  const ws = wb.addWorksheet("Products");

  ws.columns = [
    { header: "Name *", key: "name", width: 35 },
    { header: "SKU", key: "sku", width: 15 },
    { header: "Barcode", key: "barcode", width: 15 },
    { header: "Sale Price *", key: "salePrice", width: 14 },
    { header: "Purchase Price", key: "purchasePrice", width: 14 },
    { header: "Wholesale Price", key: "wholesalePrice", width: 14 },
    { header: "Brand", key: "brand", width: 20 },
    { header: "Category", key: "category", width: 20 },
    { header: "Unit", key: "unit", width: 12 },
    { header: "Status", key: "status", width: 10 },
  ];

  // Style header row
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4F46E5" },
  };
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };

  for (const p of products) {
    ws.addRow({
      name: p.name,
      sku: p.sku ?? "",
      barcode: p.barcode ?? "",
      salePrice: D(p.salePrice).toNumber(),
      purchasePrice: p.purchasePrice ? D(p.purchasePrice).toNumber() : "",
      wholesalePrice: p.wholesalePrice ? D(p.wholesalePrice).toNumber() : "",
      brand: p.brand?.name ?? "",
      category: p.category?.name ?? "",
      unit: p.unit?.name ?? "",
      status: p.status,
    });
  }

  // Number format for price columns
  ["D", "E", "F"].forEach((col) => {
    ws.getColumn(col).numFmt = "#,##0.00";
  });

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

// ─────────────────────────────────────────────────────────────
// Products XLSX import
// ─────────────────────────────────────────────────────────────

export interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

export async function importProductsXlsx(buffer: Buffer): Promise<ImportResult> {
  const ctx = await requirePermission("IMPORT_EXPORT");
  const businessId = ctx.business.id;

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer);
  const ws = wb.getWorksheet(1);
  if (!ws) throw new Error("No worksheet found");

  // Pre-load brand/category/unit lookups
  const [brands, categories, units] = await Promise.all([
    db.brand.findMany({ where: { businessId }, select: { id: true, name: true } }),
    db.category.findMany({ where: { businessId }, select: { id: true, name: true } }),
    db.unit.findMany({ where: { businessId }, select: { id: true, name: true } }),
  ]);
  const brandMap = new Map(brands.map((b) => [b.name.toLowerCase(), b.id]));
  const categoryMap = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
  const unitMap = new Map(units.map((u) => [u.name.toLowerCase(), u.id]));

  let imported = 0, updated = 0, skipped = 0;
  const errors: { row: number; message: string }[] = [];

  // Row 1 is header — start from 2
  for (let rowNum = 2; rowNum <= ws.rowCount; rowNum++) {
    const row = ws.getRow(rowNum);
    const name = String(row.getCell(1).value ?? "").trim();
    const sku = String(row.getCell(2).value ?? "").trim() || null;
    const barcode = String(row.getCell(3).value ?? "").trim() || null;
    const salePriceRaw = row.getCell(4).value;
    const purchasePriceRaw = row.getCell(5).value;
    const wholesalePriceRaw = row.getCell(6).value;
    const brandName = String(row.getCell(7).value ?? "").trim();
    const categoryName = String(row.getCell(8).value ?? "").trim();
    const unitName = String(row.getCell(9).value ?? "").trim();

    if (!name) { skipped++; continue; }
    if (!salePriceRaw || isNaN(Number(salePriceRaw))) {
      errors.push({ row: rowNum, message: `${name}: Sale Price missing or invalid` });
      continue;
    }

    try {
      const existing = sku
        ? await db.product.findFirst({ where: { businessId, sku } })
        : await db.product.findFirst({ where: { businessId, name } });

      const data = {
        name,
        sku: sku || null,
        barcode: barcode || null,
        salePrice: D(Number(salePriceRaw)).toFixed(2),
        purchasePrice: purchasePriceRaw ? D(Number(purchasePriceRaw)).toFixed(2) : null,
        wholesalePrice: wholesalePriceRaw ? D(Number(wholesalePriceRaw)).toFixed(2) : null,
        brandId: brandName ? brandMap.get(brandName.toLowerCase()) ?? null : null,
        categoryId: categoryName ? categoryMap.get(categoryName.toLowerCase()) ?? null : null,
        unitId: unitName ? unitMap.get(unitName.toLowerCase()) ?? null : null,
      };

      if (existing) {
        await db.product.update({ where: { id: existing.id }, data });
        updated++;
      } else {
        await db.product.create({ data: { businessId, ...data } });
        imported++;
      }
    } catch {
      errors.push({ row: rowNum, message: `${name}: Could not save (duplicate SKU/barcode?)` });
    }
  }

  await db.auditLog.create({
    data: {
      businessId,
      userId: ctx.user.id,
      action: "PRODUCTS_IMPORTED",
      entityType: "Product",
      metadata: { imported, updated, skipped, errors: errors.length },
    },
  });

  return { imported, updated, skipped, errors };
}

// ─────────────────────────────────────────────────────────────
// Customers XLSX export
// ─────────────────────────────────────────────────────────────

export async function exportCustomersXlsx(): Promise<Buffer> {
  const ctx = await requirePermission("IMPORT_EXPORT", { read: true });

  const customers = await db.customer.findMany({
    where: { businessId: ctx.business.id },
    orderBy: { name: "asc" },
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "BillKaro";
  const ws = wb.addWorksheet("Customers");

  ws.columns = [
    { header: "Name *", key: "name", width: 30 },
    { header: "Phone", key: "phone", width: 18 },
    { header: "Address", key: "address", width: 40 },
    { header: "Current Balance", key: "balance", width: 16 },
    { header: "Status", key: "status", width: 10 },
    { header: "Notes", key: "notes", width: 30 },
  ];

  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4F46E5" },
  };

  for (const c of customers) {
    ws.addRow({
      name: c.name,
      phone: c.phone ?? "",
      address: c.address ?? "",
      balance: D(c.currentBalance).toNumber(),
      status: c.status,
      notes: c.notes ?? "",
    });
  }

  ws.getColumn("D").numFmt = "#,##0.00";

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

// ─────────────────────────────────────────────────────────────
// Customers XLSX import
// ─────────────────────────────────────────────────────────────

export async function importCustomersXlsx(buffer: Buffer): Promise<ImportResult> {
  const ctx = await requirePermission("IMPORT_EXPORT");
  const businessId = ctx.business.id;

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer);
  const ws = wb.getWorksheet(1);
  if (!ws) throw new Error("No worksheet found");

  let imported = 0, updated = 0, skipped = 0;
  const errors: { row: number; message: string }[] = [];

  for (let rowNum = 2; rowNum <= ws.rowCount; rowNum++) {
    const row = ws.getRow(rowNum);
    const name = String(row.getCell(1).value ?? "").trim();
    const phone = String(row.getCell(2).value ?? "").trim() || null;
    const address = String(row.getCell(3).value ?? "").trim() || null;
    const notes = String(row.getCell(6).value ?? "").trim() || null;

    if (!name) { skipped++; continue; }

    try {
      const existing = phone
        ? await db.customer.findFirst({ where: { businessId, phone } })
        : await db.customer.findFirst({ where: { businessId, name } });

      if (existing) {
        await db.customer.update({
          where: { id: existing.id },
          data: { name, phone, address, notes },
        });
        updated++;
      } else {
        await db.customer.create({
          data: { businessId, name, phone, address, notes },
        });
        imported++;
      }
    } catch {
      errors.push({ row: rowNum, message: `${name}: Could not save` });
    }
  }

  return { imported, updated, skipped, errors };
}
