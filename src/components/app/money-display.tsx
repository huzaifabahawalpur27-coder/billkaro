import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";

interface MoneyDisplayProps {
  value: string | number | { toString(): string };
  symbol?: string;
  className?: string;
  /** Colors the amount by sign context: due (red), received (green). */
  tone?: "default" | "due" | "received" | "muted";
}

export function MoneyDisplay({
  value,
  symbol = "Rs.",
  className,
  tone = "default",
}: MoneyDisplayProps) {
  return (
    <span
      className={cn(
        "tabular-nums",
        tone === "due" && "text-red-600",
        tone === "received" && "text-emerald-600",
        tone === "muted" && "text-muted-foreground",
        className
      )}
    >
      {formatMoney(value, symbol)}
    </span>
  );
}
