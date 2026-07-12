"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { changeRoleAction, toggleUserAction } from "./actions";
import { StatusBadge } from "@/components/app/status-badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MemberRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  roleId: string;
  roleName: string;
  status: string;
  isSelf: boolean;
}

export function UsersTable({
  members,
  roles,
}: {
  members: MemberRow[];
  roles: { id: string; name: string }[];
}) {
  const [pending, startTransition] = useTransition();

  function handleRoleChange(memberId: string, roleId: string) {
    startTransition(async () => {
      const result = await changeRoleAction(memberId, roleId);
      if (result.ok) toast.success("Role update ho gaya.");
      else toast.error(result.error);
    });
  }

  function handleToggle(memberId: string, active: boolean) {
    startTransition(async () => {
      const result = await toggleUserAction(memberId, active);
      if (result.ok) toast.success(active ? "User enable ho gaya." : "User disable ho gaya.");
      else toast.error(result.error);
    });
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Active</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((m) => (
            <TableRow key={m.id} className={pending ? "opacity-60" : undefined}>
              <TableCell>
                <div className="font-medium text-slate-900">
                  {m.name}
                  {m.isSelf && <span className="ml-1.5 text-xs text-slate-400">(you)</span>}
                </div>
                <div className="text-xs text-slate-500">{m.email}</div>
              </TableCell>
              <TableCell className="text-slate-600">{m.phone ?? "—"}</TableCell>
              <TableCell>
                {m.isSelf ? (
                  <span className="text-sm font-medium">{m.roleName}</span>
                ) : (
                  <Select
                    defaultValue={m.roleId}
                    onValueChange={(v) => handleRoleChange(m.id, v)}
                  >
                    <SelectTrigger className="h-8 w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </TableCell>
              <TableCell>
                <StatusBadge kind={m.status === "ACTIVE" ? "active" : "inactive"}>
                  {m.status === "ACTIVE" ? "Active" : "Disabled"}
                </StatusBadge>
              </TableCell>
              <TableCell className="text-right">
                {!m.isSelf && (
                  <Switch
                    checked={m.status === "ACTIVE"}
                    onCheckedChange={(checked) => handleToggle(m.id, checked)}
                  />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
