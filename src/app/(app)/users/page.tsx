import { listMembers } from "@/server/services/users";
import { PageHeader } from "@/components/app/page-header";
import { UsersTable } from "./users-table";
import { AddUserDialog } from "./add-user-dialog";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const { members, roles, currentUserId } = await listMembers();

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Apni team ke logins aur permissions manage karein"
        actions={<AddUserDialog roles={roles} />}
      />
      <UsersTable
        members={members.map((m) => ({
          id: m.id,
          name: m.user.name,
          email: m.user.email,
          phone: m.user.phone,
          roleId: m.role.id,
          roleName: m.role.name,
          status: m.status,
          isSelf: m.user.id === currentUserId,
        }))}
        roles={roles}
      />
    </>
  );
}
