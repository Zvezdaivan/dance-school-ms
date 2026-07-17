import { NextRequest, NextResponse } from "next/server";
import { handleRoute } from "@/lib/api";
import { ApiError } from "@/lib/api-error";
import { requireApiUser } from "@/lib/auth";
import { buildWorkbook } from "@/lib/excel";
import { REPORT_TYPES, ReportType, reportQuerySchema } from "@/lib/validation";
import { buildReport } from "@/server/services/reports";

type Ctx = { params: Promise<{ type: string }> };

export const GET = handleRoute(async (req: NextRequest, ctx: Ctx) => {
  const user = await requireApiUser("reports.export");
  const { type } = await ctx.params;
  if (!REPORT_TYPES.includes(type as ReportType)) throw new ApiError(404, `Unknown report type: ${type}`);
  const sp = req.nextUrl.searchParams;
  const range = reportQuerySchema.parse({
    from: sp.get("from") || undefined,
    to: sp.get("to") || undefined,
  });

  const def = await buildReport(user, type as ReportType, range);
  const buffer = await buildWorkbook(def);
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${type}-report-${stamp}.xlsx"`,
    },
  });
});
