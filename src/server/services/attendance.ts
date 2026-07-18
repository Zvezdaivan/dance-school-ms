import { prisma } from "@/lib/db";
import { SessionUser } from "@/lib/auth";
import { orNotFound } from "@/lib/api-error";
import { parseDateInput } from "@/lib/dates";
import { attendanceBulkSchema } from "@/lib/validation";
import { z } from "zod";

/** Roster + any existing attendance for a class session. */
export async function getSessionSheet(classId: string, sessionDate: string) {
  const date = parseDateInput(sessionDate);
  const [cls, existing] = await Promise.all([
    prisma.danceClass.findFirst({
      where: { id: classId, deletedAt: null },
      include: {
        teacher: { select: { fullName: true } },
        enrollments: { where: { status: "ACTIVE" }, include: { student: true }, orderBy: { enrolledAt: "asc" } },
      },
    }),
    prisma.attendanceRecord.findMany({ where: { classId, sessionDate: date } }),
  ]);
  const found = orNotFound(cls, "Class");
  const byStudent = new Map(existing.map((r) => [r.studentId, r]));
  return {
    class: { id: found.id, name: found.name, style: found.style, teacherName: found.teacher.fullName },
    students: found.enrollments.map((e) => ({
      studentId: e.studentId,
      fullName: e.student.fullName,
      existingStatus: byStudent.get(e.studentId)?.status ?? null,
    })),
  };
}

/** Upsert the whole session's attendance in one batched transaction. */
export async function saveSessionAttendance(user: SessionUser, input: z.infer<typeof attendanceBulkSchema>) {
  const cls = orNotFound(await prisma.danceClass.findFirst({ where: { id: input.classId, deletedAt: null } }), "Class");
  const sessionDate = parseDateInput(input.sessionDate);

  await prisma.$transaction([
    ...input.records.map((record) =>
      prisma.attendanceRecord.upsert({
        where: {
          classId_studentId_sessionDate: { classId: input.classId, studentId: record.studentId, sessionDate },
        },
        create: {
          classId: input.classId,
          studentId: record.studentId,
          sessionDate,
          status: record.status,
          recordedById: user.id,
        },
        update: { status: record.status, recordedById: user.id },
      })
    ),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        action: "UPDATE",
        entityType: "Attendance",
        entityId: `${input.classId}:${input.sessionDate}`,
        summary: `Saved attendance for ${cls.name} on ${input.sessionDate} (${input.records.length} students)`,
      },
    }),
  ]);
}

/** Recent sessions summarized per class+date, aggregated in the database. */
export async function listRecentSessions(limit = 30) {
  const grouped = await prisma.attendanceRecord.groupBy({
    by: ["classId", "sessionDate", "status"],
    _count: true,
    orderBy: [{ sessionDate: "desc" }],
  });
  const classes = await prisma.danceClass.findMany({
    where: { id: { in: [...new Set(grouped.map((g) => g.classId))] } },
    select: { id: true, name: true },
  });
  const nameById = new Map(classes.map((c) => [c.id, c.name]));

  const sessions = new Map<
    string,
    { classId: string; className: string; sessionDate: Date; counts: Record<string, number>; total: number }
  >();
  for (const g of grouped) {
    const key = `${g.classId}:${g.sessionDate.toISOString()}`;
    const s = sessions.get(key) ?? {
      classId: g.classId,
      className: nameById.get(g.classId) ?? "?",
      sessionDate: g.sessionDate,
      counts: {},
      total: 0,
    };
    s.counts[g.status] = (s.counts[g.status] ?? 0) + g._count;
    s.total += g._count;
    sessions.set(key, s);
  }
  return [...sessions.values()]
    .sort((a, b) => b.sessionDate.getTime() - a.sessionDate.getTime())
    .slice(0, limit);
}
