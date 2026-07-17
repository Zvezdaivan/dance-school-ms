import { NextRequest } from "next/server";
import { handleRoute, ok } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { userCreateSchema } from "@/lib/validation";
import { createUser, listUsers } from "@/server/services/users";

export const GET = handleRoute(async () => {
  await requireApiUser("users.manage");
  return ok(await listUsers());
});

export const POST = handleRoute(async (req: NextRequest) => {
  const user = await requireApiUser("users.manage");
  const input = userCreateSchema.parse(await req.json());
  return ok(await createUser(user, input), 201);
});
