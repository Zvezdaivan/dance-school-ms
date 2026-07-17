import { NextRequest } from "next/server";
import { handleRoute, ok } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { classUpdateSchema } from "@/lib/validation";
import { getClass, softDeleteClass, updateClass } from "@/server/services/classes";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handleRoute(async (_req: NextRequest, ctx: Ctx) => {
  const user = await requireApiUser("classes.read");
  const { id } = await ctx.params;
  return ok(await getClass(user, id));
});

export const PATCH = handleRoute(async (req: NextRequest, ctx: Ctx) => {
  const user = await requireApiUser("classes.write");
  const { id } = await ctx.params;
  const input = classUpdateSchema.parse(await req.json());
  return ok(await updateClass(user, id, input));
});

export const DELETE = handleRoute(async (_req: NextRequest, ctx: Ctx) => {
  const user = await requireApiUser("classes.write");
  const { id } = await ctx.params;
  await softDeleteClass(user, id);
  return ok({ ok: true });
});
