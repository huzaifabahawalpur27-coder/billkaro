"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ShieldAlert, Plus, Save } from "lucide-react";
import { createCustomRoleAction, updateRolePermissionsAction } from "./actions";
import { ALL_PERMISSIONS, PERMISSION_LABELS } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface RoleWithPermissions {
  id: string;
  name: string;
  isSystem: boolean;
  permissions: string[];
}

interface PermissionsMatrixProps {
  initialRoles: RoleWithPermissions[];
}

export function PermissionsMatrix({ initialRoles }: PermissionsMatrixProps) {
  const [roles, setRoles] = useState(initialRoles);
  const [selectedRoleId, setSelectedRoleId] = useState(initialRoles[0]?.id || "");
  const [newRoleDialogOpen, setNewRoleDialogOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [pending, startTransition] = useTransition();

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  function handlePermissionToggle(permission: string, checked: boolean) {
    if (!selectedRole || selectedRole.name === "Owner") return;

    const currentPerms = selectedRole.permissions;
    const newPerms = checked
      ? [...currentPerms, permission]
      : currentPerms.filter((p) => p !== permission);

    setRoles((prev) =>
      prev.map((r) => (r.id === selectedRole.id ? { ...r, permissions: newPerms } : r))
    );
  }

  function handleSavePermissions() {
    if (!selectedRole) return;
    startTransition(async () => {
      const result = await updateRolePermissionsAction(
        selectedRole.id,
        selectedRole.permissions
      );
      if (result.ok) {
        toast.success(`Role "${selectedRole.name}" ke permissions save ho gaye!`);
      } else {
        toast.error(result.error || "Save karne mein error aaya.");
      }
    });
  }

  function handleCreateRole(e: React.FormEvent) {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    startTransition(async () => {
      // Create new role starting with a copy of Cashier's permissions (or empty)
      const basePerms = roles.find((r) => r.name === "Cashier")?.permissions || [];
      const result = await createCustomRoleAction(newRoleName, basePerms);

      if (result.ok) {
        toast.success("Naya role create ho gaya!");
        setNewRoleDialogOpen(false);
        setNewRoleName("");
        window.location.reload();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Selection row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50 p-4 rounded-lg border">
        <div className="space-y-1">
          <Label htmlFor="role-select" className="text-xs uppercase font-semibold text-slate-500">
            Select Role to Configure
          </Label>
          <div className="flex items-center gap-3">
            <select
              id="role-select"
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value)}
              className="flex h-10 w-full sm:w-64 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.isSystem ? "(System)" : "(Custom)"}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <Button
            onClick={() => setNewRoleDialogOpen(true)}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
          >
            <Plus className="size-4" /> Naya Custom Role
          </Button>
        </div>
      </div>

      {selectedRole && (
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {selectedRole.name} Permissions
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {selectedRole.name === "Owner"
                  ? "Owner has full access across all operations (Read-Only)."
                  : `Configure actions that users with "${selectedRole.name}" role can perform.`}
              </p>
            </div>

            {selectedRole.name !== "Owner" && (
              <Button
                onClick={handleSavePermissions}
                disabled={pending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-semibold"
              >
                <Save className="size-4" /> Save Permissions
              </Button>
            )}
          </div>

          {/* Matrix table */}
          <div className="p-6">
            {selectedRole.name === "Owner" ? (
              <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-lg p-4 text-sm text-indigo-700">
                <ShieldAlert className="size-5 shrink-0" />
                <span>
                  Owner permissions are locked for safety. The owner role always has full administrative rights.
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ALL_PERMISSIONS.map((perm) => {
                  const hasPerm = selectedRole.permissions.includes(perm);
                  return (
                    <label
                      key={perm}
                      className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                        hasPerm
                          ? "border-indigo-200 bg-indigo-50/20"
                          : "border-slate-200 hover:bg-slate-50/30"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={hasPerm}
                        onChange={(e) => handlePermissionToggle(perm, e.target.checked)}
                        disabled={pending}
                        className="mt-1 size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                      />
                      <div className="space-y-0.5">
                        <span className="text-sm font-semibold text-slate-900">
                          {PERMISSION_LABELS[perm] || perm}
                        </span>
                        <p className="text-xs text-slate-400 leading-tight">
                          Code ID: <code className="font-mono text-[10px] bg-slate-100 px-1 rounded">{perm}</code>
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Custom Role Dialog */}
      <Dialog open={newRoleDialogOpen} onOpenChange={setNewRoleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateRole}>
            <DialogHeader>
              <DialogTitle>Naya Custom Role Shamil Karein</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-role-name">Role Name (English)</Label>
                <Input
                  id="new-role-name"
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g., Senior Manager, Supervisor"
                  required
                />
              </div>
              <p className="text-xs text-slate-400">
                Tip: Initial permissions will be copied from the default Cashier role. You can customize them afterward.
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewRoleDialogOpen(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending} className="bg-indigo-600 hover:bg-indigo-700">
                {pending ? "Creating..." : "Create Role"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
