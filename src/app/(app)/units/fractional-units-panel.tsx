"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Scale } from "lucide-react";
import { setUnitFractionalAction } from "./actions";
import { Switch } from "@/components/ui/switch";

export interface UnitRow {
  id: string;
  name: string;
  isFractional: boolean;
}

/**
 * Loose/weight toggle per unit: fractional units get 0.25-step quantity
 * entry and ¼/½/1/2 quick chips on the POS (500 g = 0.5 Kg, etc).
 */
export function FractionalUnitsPanel({
  units,
  canManage,
}: {
  units: UnitRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-6 rounded-lg border bg-white dark:bg-slate-900 shadow-sm">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Scale className="h-4 w-4 text-muted-foreground" />
        <div>
          <h2 className="text-sm font-semibold">Loose / Weight Units</h2>
          <p className="text-xs text-muted-foreground">
            On karne se POS par fractions allow hote hain — 500 gram = 0.5 Kg, ¼/½ chips wagera.
          </p>
        </div>
      </div>
      <ul className="divide-y">
        {units.map((u) => (
          <li key={u.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <span className="font-medium">{u.name}</span>
            <Switch
              checked={u.isFractional}
              disabled={!canManage || pending}
              aria-label={`${u.name} fractional`}
              onCheckedChange={(v) =>
                startTransition(async () => {
                  const result = await setUnitFractionalAction(u.id, v);
                  if (result.ok) {
                    toast.success(`"${u.name}" ${v ? "ab loose/weight unit hai" : "ab whole unit hai"}.`);
                    router.refresh();
                  } else {
                    toast.error(result.error ?? "Update nahi ho saka.");
                  }
                })
              }
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
