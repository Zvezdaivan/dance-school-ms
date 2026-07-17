import { prisma } from "@/lib/db";
import { SessionUser } from "@/lib/auth";
import { ApiError } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";
import { parseDateInput } from "@/lib/dates";
import { attendanceBulkSchema } from "@/lib/validation";
import { z } from "zod";

/** Roster + any existing attendance for a class session. */
export async function getSessionSheet(classId: string, sessionDate: string) {
  const cls = await prisma.danceClass.findFirst({
    where: { id: classId, deletedAt: null },
    include: {
      teacher: { select: { fullName: true } },
      enrollments: { where: { status: "ACTIVE" }, include: { student: true }, orderBy: { enrolledAt: "asc" } },
    },
  });
  if (!cls) throw new ApiError(404, "Class not found");
  const date = parseDateInput(sessionDate);
  const existing = await prisma.attendanceRecord.findMany({ where: { classId, sessionDate: date } });
  const byStudent = new Map(existing.map((r) => [r.studentId, r]));
  return {
    class: { id: cls.id, name: cls.name, style: cls.style, teacherName: cls.teacher.fullName },
    students: cls.enrollments.map((e) => ({
      studentId: e.studentId,
      fullName: e.student.fullName,
      existingStatus: byStudent.get(e.studentId)?.status ?? null,
      existingNotes: byStudent.get(e.studentId)?.notes ?? null,
    })),
  };
}

/** Upsert the whole session's attendance in one transaction. */
export async function saveSessionAttendance(user: SessionUser, input: z.infer<typeof attendanceBulkSchema>) {
  const cls = await prisma.danceClass.findFirst({ where: { id: input.classId, deletedAt: null } });
  if (!cls) throw new ApiError(404, "Class not found");
  const sessionDate = parseDateInput(input.sessionDate);

  await prisma.$transaction(async (tx) => {
    for (const record of input.records) {
      await tx.attendanceRecord.upsert({
        where: {
          classId_studentId_sessionDate: { classId: input.classId, studentId: record.studentId, sessionDate },
        },
        create: {
          classId: input.classId,
          studentId: record.studentId,
          sessionDate,
          status: record.status,
          notes: record.notes,
          recordedById: user.id,
        },
        update: { status: record.status, notes: record.notes, recordedById: user.id },
      });
    }
    await logAudit(
      user,
      {
        action: "UPDATE",
        entityType: "Attendance",
        entityId: `${input.classId}:${input.sessionDate}`,
        summary: `Saved attendance for ${cls.name} on ${input.sessionDate} (${input.records.length} students)`,
      },
      tx
    );
  });
}

export async function listRecentSessions(limit = 30) {
  const records = await prisma.attendanceRecord.findMany({
    include: { class: { select: { id: true, name: true } } },
    orderBy: { sessionDate: "desc" },
    take: 500,
  });
  const sessions = new Map<
    string,
    { classId: string; className: string; sessionDate: Date; counts: Record<string, number>; total: number }
  >();
  for (const r of records) {
    const key = `${r.classId}:${r.sessionDate.toISOString()}`;
    const s = sessions.get(key) ?? {
      classId: r.classId,
      className: r.class.name,
      sessionDate: r.sessionDate,
      counts: {},
      total: 0,
    };
    s.counts[r.status] = (s.counts[r.status] ?? 0) + 1;
    s.total += 1;
    sessions.set(key, s);
  }
  return [...sessions.values()].slice(0, limit);
}
