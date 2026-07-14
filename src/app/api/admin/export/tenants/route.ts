import { exportTenantsXlsx } from "@/server/services/platform/tenants";

export const dynamic = "force-dynamic";

export async function GET() {
  const buffer = await exportTenantsXlsx();
  const date = new Date().toISOString().slice(0, 10);
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="tenants-${date}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
