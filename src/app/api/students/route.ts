import { NextRequest } from "next/server";
import { handleRoute, ok } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { studentCreateSchema } from "@/lib/validation";
import { createStudent, listStudents, StudentListParams } from "@/server/services/students";

export const GET = handleRoute(async (req: NextRequest) => {
  await requireApiUser("students.read");
  const sp = req.nextUrl.searchParams;
  const params: StudentListParams = {
    q: sp.get("q") ?? undefined,
    status: sp.get("status") ?? undefined,
    sort: (sp.get("sort") as StudentListParams["sort"]) ?? undefined,
    order: (sp.get("order") as StudentListParams["order"]) ?? undefined,
    page: sp.get("page") ? Number(sp.get("page")) : undefined,
  };
  return ok(await listStudents(params));
});

export const POST = handleRoute(async (req: NextRequest) => {
  const user = await requireApiUser("students.write");
  const input = studentCreateSchema.parse(await req.json());
  return ok(await createStudent(user, input), 201);
});
