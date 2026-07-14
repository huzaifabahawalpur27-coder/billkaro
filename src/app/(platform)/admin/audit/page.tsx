import { listPlatformAudit } from "@/server/services/platform/audit";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { ScrollText } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PlatformAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const { entries, total } = await listPlatformAudit(
    params.page ? parseInt(params.page, 10) || 1 : 1
  );

  return (
    <>
      <PageHeader title="Audit Log" subtitle={`Platform actions ka record (${total})`} />
      {entries.length === 0 ? (
        <EmptyState icon={ScrollText} title="Abhi koi entry nahi" />
      ) : (
        <div className="rounded-lg border bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-sm whitespace-nowrap">
                    {formatDateTime(e.createdAt)}
                  </TableCell>
                  <TableCell className="text-sm">{e.actorName}</TableCell>
                  <TableCell className="text-sm font-mono text-xs">{e.action}</TableCell>
                  <TableCell className="text-sm">{e.businessName ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-md truncate">
                    {e.metadata ? JSON.stringify(e.metadata) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
