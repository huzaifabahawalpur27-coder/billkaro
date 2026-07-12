/**
 * Client-safe display formatting. Locale-aware number formatting with the
 * business currency symbol ("Rs." for PKR by default). Never used for math.
 */

const formatter = new Intl.NumberFormat("en-PK", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatAmount(value: string | number | { toString(): string }): string {
  const num = Number(value?.toString() ?? 0);
  if (!Number.isFinite(num)) return "0";
  return formatter.format(num);
}

export function formatMoney(
  value: string | number | { toString(): string },
  symbol = "Rs."
): string {
  return `${symbol} ${formatAmount(value)}`;
}

export function formatDate(value: Date | string): string {
  return new Date(value).toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(value: Date | string): string {
  return new Date(value).toLocaleTimeString("en-PK", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatDateTime(value: Date | string): string {
  return `${formatDate(value)}, ${formatTime(value)}`;
}
