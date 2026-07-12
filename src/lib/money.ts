/**
 * Money utilities. All financial math goes through Decimal — never
 * JavaScript floats. The server recalculates every bill; client-side
 * math is UI feedback only.
 */
import Decimal from "decimal.js";

export type MoneyInput = Decimal.Value | { toString(): string } | null | undefined;

/** Coerce any money-ish value (Prisma Decimal, string, number) to Decimal. */
export function D(value: MoneyInput): Decimal {
  if (value === null || value === undefined || value === "") return new Decimal(0);
  return new Decimal(value.toString());
}

export function round2(value: Decimal): Decimal {
  return value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export type RoundingRule = "NONE" | "NEAREST_1" | "NEAREST_5" | "NEAREST_10";

/** Apply a business price-rounding rule (used by bulk price updates). */
export function applyRounding(value: Decimal, rule: RoundingRule): Decimal {
  switch (rule) {
    case "NEAREST_1":
      return value.toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
    case "NEAREST_5":
      return value.div(5).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).mul(5);
    case "NEAREST_10":
      return value.div(10).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).mul(10);
    default:
      return round2(value);
  }
}

/** price × quantity, rounded to 2dp. */
export function lineTotal(price: MoneyInput, quantity: MoneyInput): Decimal {
  return round2(D(price).mul(D(quantity)));
}

export type DiscountType = "NONE" | "FIXED" | "PERCENT";

export interface BillTotals {
  subtotal: Decimal;
  discountAmount: Decimal;
  taxAmount: Decimal;
  grandTotal: Decimal;
}

/**
 * Compute bill totals from line items. Single source of truth — used by
 * the billing service on the server and mirrored in the POS UI.
 */
export function calculateBill(params: {
  items: { soldPrice: MoneyInput; quantity: MoneyInput }[];
  discountType: DiscountType;
  discountValue: MoneyInput;
  taxRate: MoneyInput;
}): BillTotals {
  const subtotal = round2(
    params.items.reduce(
      (sum, item) => sum.add(lineTotal(item.soldPrice, item.quantity)),
      new Decimal(0)
    )
  );

  let discountAmount = new Decimal(0);
  if (params.discountType === "FIXED") {
    discountAmount = round2(D(params.discountValue));
  } else if (params.discountType === "PERCENT") {
    discountAmount = round2(subtotal.mul(D(params.discountValue)).div(100));
  }
  if (discountAmount.gt(subtotal)) discountAmount = subtotal;
  if (discountAmount.lt(0)) discountAmount = new Decimal(0);

  const taxable = subtotal.sub(discountAmount);
  const taxAmount = round2(taxable.mul(D(params.taxRate)).div(100));
  const grandTotal = round2(taxable.add(taxAmount));

  return { subtotal, discountAmount, taxAmount, grandTotal };
}

/** Percentage price adjustment used by bulk updates. */
export function adjustByPercent(
  price: MoneyInput,
  percent: MoneyInput,
  direction: "INCREASE" | "DECREASE",
  rounding: RoundingRule = "NONE"
): Decimal {
  const factor = D(percent).div(100);
  const base = D(price);
  const delta = base.mul(factor);
  const raw = direction === "INCREASE" ? base.add(delta) : base.sub(delta);
  const result = applyRounding(raw, rounding);
  return result.lt(0) ? new Decimal(0) : result;
}
