import { exportProductsXlsx } from "@/server/services/import-export";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const buffer = await exportProductsXlsx();
    const filename = `products-${new Date().toISOString().slice(0, 10)}.xlsx`;
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Export failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
