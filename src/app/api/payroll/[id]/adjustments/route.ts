import { NextRequest } from "next/server";
import { handleRoute, ok } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { payrollAdjustmentSchema } from "@/lib/validation";
import { addAdjustment } from "@/server/services/payroll";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handleRoute(async (req: NextRequest, ctx: Ctx) => {
  const user = await requireApiUser("payroll.write");
  const { id } = await ctx.params;
  const input = payrollAdjustmentSchema.parse(await req.json());
  return ok(await addAdjustment(user, id, input), 201);
});
