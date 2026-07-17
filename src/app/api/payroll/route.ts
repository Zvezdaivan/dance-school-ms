import { NextRequest } from "next/server";
import { handleRoute, ok } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { payrollGenerateSchema } from "@/lib/validation";
import { generatePayroll, listPayrolls } from "@/server/services/payroll";

export const GET = handleRoute(async (req: NextRequest) => {
  const user = await requireApiUser("payroll.read");
  const sp = req.nextUrl.searchParams;
  return ok(
    await listPayrolls(user, {
      month: sp.get("month") ?? undefined,
      status: sp.get("status") ?? undefined,
      teacherId: sp.get("teacherId") ?? undefined,
    })
  );
});

export const POST = handleRoute(async (req: NextRequest) => {
  const user = await requireApiUser("payroll.write");
  const { month, teacherId } = payrollGenerateSchema.parse(await req.json());
  return ok(await generatePayroll(user, month, teacherId), 201);
});
