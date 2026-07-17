import { NextRequest } from "next/server";
import { handleRoute, ok } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { ApiError } from "@/lib/api-error";
import { attendanceBulkSchema } from "@/lib/validation";
import { getSessionSheet, saveSessionAttendance } from "@/server/services/attendance";

export const GET = handleRoute(async (req: NextRequest) => {
  await requireApiUser("attendance.read");
  const sp = req.nextUrl.searchParams;
  const classId = sp.get("classId");
  const sessionDate = sp.get("sessionDate");
  if (!classId || !sessionDate) throw new ApiError(400, "classId and sessionDate are required");
  return ok(await getSessionSheet(classId, sessionDate));
});

export const POST = handleRoute(async (req: NextRequest) => {
  const user = await requireApiUser("attendance.write");
  const input = attendanceBulkSchema.parse(await req.json());
  await saveSessionAttendance(user, input);
  return ok({ ok: true });
});
