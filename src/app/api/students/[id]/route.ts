import { NextRequest } from "next/server";
import { handleRoute, ok } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { studentUpdateSchema } from "@/lib/validation";
import { getStudent, softDeleteStudent, updateStudent } from "@/server/services/students";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handleRoute(async (_req: NextRequest, ctx: Ctx) => {
  await requireApiUser("students.read");
  const { id } = await ctx.params;
  return ok(await getStudent(id));
});

export const PATCH = handleRoute(async (req: NextRequest, ctx: Ctx) => {
  const user = await requireApiUser("students.write");
  const { id } = await ctx.params;
  const input = studentUpdateSchema.parse(await req.json());
  return ok(await updateStudent(user, id, input));
});

export const DELETE = handleRoute(async (_req: NextRequest, ctx: Ctx) => {
  const user = await requireApiUser("students.write");
  const { id } = await ctx.params;
  await softDeleteStudent(user, id);
  return ok({ ok: true });
});
