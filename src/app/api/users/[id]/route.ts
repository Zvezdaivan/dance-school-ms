import { NextRequest } from "next/server";
import { handleRoute, ok } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { userUpdateSchema } from "@/lib/validation";
import { updateUser } from "@/server/services/users";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handleRoute(async (req: NextRequest, ctx: Ctx) => {
  const user = await requireApiUser("users.manage");
  const { id } = await ctx.params;
  const input = userUpdateSchema.parse(await req.json());
  return ok(await updateUser(user, id, input));
});
