import { listMembers, listRolesWithPermissions } from "@/server/services/users";
import { PageHeader } from "@/components/app/page-header";
import { UsersTable } from "./users-table";
import { AddUserDialog } from "./add-user-dialog";
import { PermissionsMatrix } from "./permissions-matrix";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const [{ members, roles, currentUserId }, rolesWithPermissions] = await Promise.all([
    listMembers(),
    listRolesWithPermissions(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Settings"
        subtitle="Manage team members, roles, and operation permissions"
        actions={<AddUserDialog roles={roles} />}
      />

      <Tabs defaultValue="members" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mb-6">
          <TabsTrigger value="members">Team Logins (لاگ ان ممبرز)</TabsTrigger>
          <TabsTrigger value="permissions">Permissions Matrix (اختیارات)</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4 focus-visible:outline-none">
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
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4 focus-visible:outline-none">
          <PermissionsMatrix initialRoles={rolesWithPermissions} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
