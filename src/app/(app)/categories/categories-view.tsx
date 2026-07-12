"use client";

import { EntityTable, type EntityRow } from "../brands/entity-table";
import {
  addCategoryAction,
  renameCategoryAction,
  deleteCategoryAction,
} from "../brands/actions";

export function CategoriesView({ rows, canManage }: { rows: EntityRow[]; canManage: boolean }) {
  return (
    <EntityTable
      entityLabel="Category"
      rows={rows}
      canManage={canManage}
      onAdd={addCategoryAction}
      onRename={renameCategoryAction}
      onDelete={deleteCategoryAction}
    />
  );
}
