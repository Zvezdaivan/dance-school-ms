import { NextRequest } from "next/server";
import { handleRoute, ok } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { workLogUpdateSchema } from "@/lib/validation";
import { softDeleteWorkLog, updateWorkLog } from "@/server/services/worklogs";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handleRoute(async (req: NextRequest, ctx: Ctx) => {
  const user = await requireApiUser("worklogs.write");
  const { id } = await ctx.params;
  const input = workLogUpdateSchema.parse(await req.json());
  return ok(await updateWorkLog(user, id, input));
});

export const DELETE = handleRoute(async (_req: NextRequest, ctx: Ctx) => {
  const user = await requireApiUser("worklogs.write");
  const { id } = await ctx.params;
  await softDeleteWorkLog(user, id);
  return ok({ ok: true });
});
