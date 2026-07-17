import { NextRequest } from "next/server";
import { handleRoute, ok } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { payrollStatusSchema } from "@/lib/validation";
import { getPayroll, setPayrollStatus } from "@/server/services/payroll";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handleRoute(async (_req: NextRequest, ctx: Ctx) => {
  const user = await requireApiUser("payroll.read");
  const { id } = await ctx.params;
  return ok(await getPayroll(user, id));
});

export const PATCH = handleRoute(async (req: NextRequest, ctx: Ctx) => {
  const user = await requireApiUser("payroll.write");
  const { id } = await ctx.params;
  const input = payrollStatusSchema.parse(await req.json());
  return ok(await setPayrollStatus(user, id, input));
});
