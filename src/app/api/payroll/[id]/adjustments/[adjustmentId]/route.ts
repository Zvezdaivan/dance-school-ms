import { NextRequest } from "next/server";
import { handleRoute, ok } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { removeAdjustment } from "@/server/services/payroll";

type Ctx = { params: Promise<{ id: string; adjustmentId: string }> };

export const DELETE = handleRoute(async (_req: NextRequest, ctx: Ctx) => {
  const user = await requireApiUser("payroll.write");
  const { id, adjustmentId } = await ctx.params;
  return ok(await removeAdjustment(user, id, adjustmentId));
});
