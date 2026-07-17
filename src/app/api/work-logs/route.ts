import { NextRequest } from "next/server";
import { handleRoute, ok } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { workLogCreateSchema } from "@/lib/validation";
import { createWorkLog, listWorkLogs } from "@/server/services/worklogs";

export const GET = handleRoute(async (req: NextRequest) => {
  const user = await requireApiUser("worklogs.read");
  const sp = req.nextUrl.searchParams;
  return ok(
    await listWorkLogs(user, {
      teacherId: sp.get("teacherId") ?? undefined,
      approvalStatus: sp.get("approvalStatus") ?? undefined,
      month: sp.get("month") ?? undefined,
      page: sp.get("page") ? Number(sp.get("page")) : undefined,
    })
  );
});

export const POST = handleRoute(async (req: NextRequest) => {
  const user = await requireApiUser("worklogs.write");
  const input = workLogCreateSchema.parse(await req.json());
  return ok(await createWorkLog(user, input), 201);
});
