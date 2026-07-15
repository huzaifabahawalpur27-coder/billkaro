import { listUnitOptions } from "@/server/services/catalogue";
import { requireBusiness, hasPermission } from "@/server/auth/guards";
import { PageHeader } from "@/components/app/page-header";
import { EntityTable } from "../brands/entity-table";
import { addUnitAction, renameUnitAction, deleteUnitAction } from "./actions";
import { FractionalUnitsPanel } from "./fractional-units-panel";

export const dynamic = "force-dynamic";

export default async function UnitsPage() {
  const ctx = await requireBusiness();
  const units = await listUnitOptions();

  return (
    <>
      <PageHeader title="Units" subtitle="Measurement units manage karein (kg, litre, packet…)" />
      <EntityTable
        entityLabel="Unit"
        rows={units.map((u) => ({ id: u.id, name: u.name, productCount: 0 }))}
        canManage={hasPermission(ctx, "ADD_PRODUCTS")}
        onAdd={addUnitAction}
        onRename={renameUnitAction}
        onDelete={deleteUnitAction}
      />
      <FractionalUnitsPanel
        units={units.map((u) => ({ id: u.id, name: u.name, isFractional: u.isFractional }))}
        canManage={hasPermission(ctx, "EDIT_PRODUCTS")}
      />
    </>
  );
}
