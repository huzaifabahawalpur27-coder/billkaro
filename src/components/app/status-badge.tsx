import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusKind =
  | "paid"
  | "partial"
  | "udhaar"
  | "cancelled"
  | "active"
  | "inactive"
  | "success"
  | "warning"
  | "danger"
  | "neutral";

const STYLES: Record<StatusKind, string> = {
  paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
  success: "bg-emerald-100 text-emerald-800 border-emerald-200",
  active: "bg-emerald-100 text-emerald-800 border-emerald-200",
  partial: "bg-amber-100 text-amber-800 border-amber-200",
  warning: "bg-amber-100 text-amber-800 border-amber-200",
  udhaar: "bg-red-100 text-red-700 border-red-200",
  danger: "bg-red-100 text-red-700 border-red-200",
  cancelled: "bg-slate-100 text-slate-600 border-slate-200 line-through",
  inactive: "bg-slate-100 text-slate-600 border-slate-200",
  neutral: "bg-slate-100 text-slate-700 border-slate-200",
};

export function StatusBadge({
  kind,
  children,
  className,
}: {
  kind: StatusKind;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn("font-medium", STYLES[kind], className)}>
      {children}
    </Badge>
  );
}
