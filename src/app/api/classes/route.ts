import { NextRequest } from "next/server";
import { handleRoute, ok } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { classCreateSchema } from "@/lib/validation";
import { createClass, listClasses } from "@/server/services/classes";

export const GET = handleRoute(async (req: NextRequest) => {
  const user = await requireApiUser("classes.read");
  const sp = req.nextUrl.searchParams;
  return ok(
    await listClasses(user, {
      q: sp.get("q") ?? undefined,
      status: sp.get("status") ?? undefined,
      teacherId: sp.get("teacherId") ?? undefined,
    })
  );
});

export const POST = handleRoute(async (req: NextRequest) => {
  const user = await requireApiUser("classes.write");
  const input = classCreateSchema.parse(await req.json());
  return ok(await createClass(user, input), 201);
});
