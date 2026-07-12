"use client";

import { useState } from "react";
import { Percent } from "lucide-react";
import { EntityTable, type EntityRow } from "./entity-table";
import { addBrandAction, renameBrandAction, deleteBrandAction } from "./actions";
import { BulkPriceModal } from "@/components/app/bulk-price-modal";
import { Button } from "@/components/ui/button";

export function BrandsView({
  rows,
  canManage,
  canBulkUpdate,
}: {
  rows: EntityRow[];
  canManage: boolean;
  canBulkUpdate: boolean;
}) {
  const [bulkBrand, setBulkBrand] = useState<{ id: string; name: string } | null>(null);

  return (
    <>
      <EntityTable
        entityLabel="Brand"
        rows={rows}
        showLastUpdate
        canManage={canManage}
        onAdd={addBrandAction}
        onRename={renameBrandAction}
        onDelete={deleteBrandAction}
        extraAction={(row) =>
          canBulkUpdate && row.productCount > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkBrand({ id: row.id, name: row.name })}
            >
              <Percent className="size-3.5" />
              Update Prices
            </Button>
          ) : null
        }
      />
      <BulkPriceModal
        open={!!bulkBrand}
        onOpenChange={(open) => !open && setBulkBrand(null)}
        brand={bulkBrand}
      />
    </>
  );
}
