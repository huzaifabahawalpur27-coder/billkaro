import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  backHref?: string;
}

export function PageHeader({ title, subtitle, actions, backHref }: PageHeaderProps) {
  return (
    <div className="pb-5 space-y-1">
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-slate-700 mb-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
