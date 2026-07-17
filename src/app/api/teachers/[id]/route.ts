import { NextRequest } from "next/server";
import { handleRoute, ok } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { teacherUpdateSchema } from "@/lib/validation";
import { getTeacher, softDeleteTeacher, updateTeacher } from "@/server/services/teachers";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handleRoute(async (_req: NextRequest, ctx: Ctx) => {
  await requireApiUser("teachers.read");
  const { id } = await ctx.params;
  return ok(await getTeacher(id));
});

export const PATCH = handleRoute(async (req: NextRequest, ctx: Ctx) => {
  const user = await requireApiUser("teachers.write");
  const { id } = await ctx.params;
  const input = teacherUpdateSchema.parse(await req.json());
  return ok(await updateTeacher(user, id, input));
});

export const DELETE = handleRoute(async (_req: NextRequest, ctx: Ctx) => {
  const user = await requireApiUser("teachers.write");
  const { id } = await ctx.params;
  await softDeleteTeacher(user, id);
  return ok({ ok: true });
});
