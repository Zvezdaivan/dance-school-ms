import { NextRequest } from "next/server";
import { handleRoute, ok } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { paymentUpdateSchema } from "@/lib/validation";
import { updatePayment, voidPayment } from "@/server/services/payments";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handleRoute(async (req: NextRequest, ctx: Ctx) => {
  const user = await requireApiUser("payments.write");
  const { id } = await ctx.params;
  const input = paymentUpdateSchema.parse(await req.json());
  return ok(await updatePayment(user, id, input));
});

export const DELETE = handleRoute(async (_req: NextRequest, ctx: Ctx) => {
  const user = await requireApiUser("payments.write");
  const { id } = await ctx.params;
  await voidPayment(user, id);
  return ok({ ok: true });
});
