import { NextRequest } from "next/server";
import { handleRoute, ok } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { enrollmentUpdateSchema } from "@/lib/validation";
import { updateEnrollment } from "@/server/services/classes";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handleRoute(async (req: NextRequest, ctx: Ctx) => {
  const user = await requireApiUser("classes.write");
  const { id } = await ctx.params;
  const input = enrollmentUpdateSchema.parse(await req.json());
  return ok(await updateEnrollment(user, id, input));
});
