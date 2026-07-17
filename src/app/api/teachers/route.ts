import { NextRequest } from "next/server";
import { handleRoute, ok } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { teacherCreateSchema } from "@/lib/validation";
import { createTeacher, listTeachers } from "@/server/services/teachers";

export const GET = handleRoute(async (req: NextRequest) => {
  await requireApiUser("teachers.read");
  const sp = req.nextUrl.searchParams;
  return ok(
    await listTeachers({
      q: sp.get("q") ?? undefined,
      status: sp.get("status") ?? undefined,
      employmentType: sp.get("employmentType") ?? undefined,
    })
  );
});

export const POST = handleRoute(async (req: NextRequest) => {
  const user = await requireApiUser("teachers.write");
  const input = teacherCreateSchema.parse(await req.json());
  return ok(await createTeacher(user, input), 201);
});
