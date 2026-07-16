"use server";

import { z } from "zod";
import {
  searchProductsForBilling,
  createSale,
  modifySale,
  SaleValidationError,
  type CreateSaleInput,
} from "@/server/services/billing";
import {
  searchCustomersForBilling,
  quickCreateCustomer,
} from "@/server/services/customers";
import { SubscriptionExpiredError } from "@/server/auth/guards";
import {
  createQuotation,
  QuotationError,
  type CreateQuotationInput,
} from "@/server/services/quotations";

export interface ActionResult<T = undefined> {
  ok: boolean;
  error: string | null;
  data?: T;
}

export async function searchProductsAction(query: string) {
  try {
    return await searchProductsForBilling(query);
  } catch {
    return [];
  }
}

export async function searchCustomersAction(query: string) {
  try {
    return await searchCustomersForBilling(query);
  } catch {
    return [];
  }
}

export async function quickAddCustomerAction(
  name: string,
  phone: string
): Promise<ActionResult<{ id: string; name: string; phone: string | null; currentBalance: string }>> {
  try {
    const customer = await quickCreateCustomer(name, phone || null);
    return { ok: true, error: null, data: customer };
  } catch {
    return { ok: false, error: "Customer add nahi ho saka." };
  }
}

const decimalStr = z.string().trim().regex(/^\d+(\.\d{1,3})?$/);

const saleSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().nullable().optional(),
        name: z.string().max(200).optional(),
        soldPrice: decimalStr,
        quantity: decimalStr,
      })
    )
    .min(1)
    .max(200),
  discountType: z.enum(["NONE", "FIXED", "PERCENT"]),
  discountValue: decimalStr.or(z.literal("")).transform((v) => v || "0"),
  customerId: z.string().nullable().optional(),
  paymentMethod: z.enum(["CASH", "CARD", "BANK_TRANSFER", "CREDIT", "OTHER"]),
  amountPaid: decimalStr.or(z.literal("")).transform((v) => v || "0"),
  cashReceived: decimalStr.nullable().optional().or(z.literal("")),
  notes: z.string().max(500).nullable().optional(),
  quotationId: z.string().nullable().optional(),
});

export interface SaleReceipt {
  saleId: string;
  invoiceNumber: string;
  grandTotal: string;
  amountPaid: string;
  amountDue: string;
  changeDue: string | null;
  paymentStatus: string;
  customerName: string | null;
}

const SALE_ERRORS: Record<string, string> = {
  EMPTY_BILL: "Bill mein koi item nahi hai.",
  INVALID_QUANTITY: "Quantity sahi nahi hai.",
  INVALID_PRICE: "Price sahi nahi hai.",
  PRODUCT_NOT_FOUND: "Koi product nahi mila — bill dubara banayein.",
  OPEN_ITEM_NAME_REQUIRED: "Open item ka naam zaroori hai.",
  CUSTOMER_REQUIRED: "Udhaar bill ke liye customer select karna zaroori hai.",
  CUSTOMER_NOT_FOUND: "Customer nahi mila.",
  DISCOUNT_NOT_ALLOWED: "Aap ko discount dene ki ijazat nahi hai.",
  INVALID_AMOUNT_PAID: "Received amount sahi nahi hai.",
};

const quotationSchema = z.object({
  items: saleSchema.shape.items,
  discountType: z.enum(["NONE", "FIXED", "PERCENT"]),
  discountValue: decimalStr.or(z.literal("")).transform((v) => v || "0"),
  customerId: z.string().nullable().optional(),
  customerName: z.string().trim().max(120).nullable().optional(),
  validityDays: z.coerce.number().int().min(1).max(365).optional(),
  notes: z.string().max(500).nullable().optional(),
});

export interface QuotationReceipt {
  quotationId: string;
  quotationNumber: string;
  grandTotal: string;
  validUntil: string;
  customerName: string | null;
}

const QUOTATION_ERRORS: Record<string, string> = {
  QUOTATIONS_DISABLED: "Quotation feature settings se on karein.",
  EMPTY_QUOTATION: "Quotation mein koi item nahi hai.",
  INVALID_QUANTITY: "Quantity sahi nahi hai.",
  INVALID_PRICE: "Price sahi nahi hai.",
  PRODUCT_NOT_FOUND: "Koi product nahi mila — dubara try karein.",
  OPEN_ITEM_NAME_REQUIRED: "Open item ka naam zaroori hai.",
  CUSTOMER_NOT_FOUND: "Customer nahi mila.",
};

export async function createQuotationAction(
  input: unknown
): Promise<ActionResult<QuotationReceipt>> {
  const parsed = quotationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Quotation ki details sahi nahi hain." };
  }

  try {
    const receipt = await createQuotation(parsed.data as CreateQuotationInput);
    return { ok: true, error: null, data: receipt };
  } catch (e) {
    if (e instanceof QuotationError) {
      return { ok: false, error: QUOTATION_ERRORS[e.code] ?? "Quotation save nahi ho saki." };
    }
    if (e instanceof SubscriptionExpiredError) {
      return {
        ok: false,
        error: "Subscription khatam ho gayi hai — abhi sirf dekh sakte hain.",
      };
    }
    console.error("createQuotationAction failed:", e);
    return { ok: false, error: "Quotation save nahi ho saki. Dubara try karein." };
  }
}

export async function createSaleAction(input: unknown): Promise<ActionResult<SaleReceipt>> {
  const parsed = saleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Bill ki details sahi nahi hain. Dubara check karein." };
  }

  try {
    const receipt = await createSale({
      ...parsed.data,
      cashReceived: parsed.data.cashReceived || null,
    } as CreateSaleInput);
    return { ok: true, error: null, data: receipt };
  } catch (e) {
    if (e instanceof SaleValidationError) {
      return { ok: false, error: SALE_ERRORS[e.code] ?? "Bill save nahi ho saka." };
    }
    if (e instanceof SubscriptionExpiredError) {
      return {
        ok: false,
        error: "Subscription khatam ho gayi hai — abhi sirf dekh sakte hain. Renew karne ke liye rabta karein.",
      };
    }
    console.error("createSaleAction failed:", e);
    return { ok: false, error: "Bill save nahi ho saka. Dubara try karein." };
  }
}

export async function modifySaleAction(input: unknown): Promise<ActionResult<SaleReceipt>> {
  const parsed = z.object({
    originalSaleId: z.string(),
    saleData: saleSchema,
  }).safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: "Bill ki details sahi nahi hain. Dubara check karein." };
  }

  try {
    const receipt = await modifySale(
      parsed.data.originalSaleId,
      {
        ...parsed.data.saleData,
        cashReceived: parsed.data.saleData.cashReceived || null,
      } as CreateSaleInput
    );
    return { ok: true, error: null, data: receipt };
  } catch (e) {
    if (e instanceof SaleValidationError) {
      return { ok: false, error: SALE_ERRORS[e.code] ?? e.message ?? "Bill save nahi ho saka." };
    }
    if (e instanceof SubscriptionExpiredError) {
      return {
        ok: false,
        error: "Subscription khatam ho gayi hai — abhi sirf dekh sakte hain. Renew karne ke liye rabta karein.",
      };
    }
    console.error("modifySaleAction failed:", e);
    return { ok: false, error: "Bill modify nahi ho saka. Dubara try karein." };
  }
}

