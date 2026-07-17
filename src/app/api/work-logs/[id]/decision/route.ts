import { NextRequest } from "next/server";
import { handleRoute, ok } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { workLogDecisionSchema } from "@/lib/validation";
import { decideWorkLog } from "@/server/services/worklogs";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handleRoute(async (req: NextRequest, ctx: Ctx) => {
  const user = await requireApiUser("worklogs.approve");
  const { id } = await ctx.params;
  const { decision } = workLogDecisionSchema.parse(await req.json());
  return ok(await decideWorkLog(user, id, decision));
});
