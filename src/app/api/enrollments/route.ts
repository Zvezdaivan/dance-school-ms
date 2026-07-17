import { NextRequest } from "next/server";
import { handleRoute, ok } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { enrollmentCreateSchema } from "@/lib/validation";
import { enrollStudent } from "@/server/services/classes";

export const POST = handleRoute(async (req: NextRequest) => {
  const user = await requireApiUser("classes.write");
  const input = enrollmentCreateSchema.parse(await req.json());
  return ok(await enrollStudent(user, input), 201);
});
