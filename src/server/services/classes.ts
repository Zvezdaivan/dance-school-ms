import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { scopeTeacherId, SessionUser } from "@/lib/auth";
import { ApiError, orNotFound } from "@/lib/api-error";
import { logAudit, diffChanges } from "@/lib/audit";
import { parseDateInput } from "@/lib/dates";
import {
  classCreateSchema,
  classUpdateSchema,
  enrollmentCreateSchema,
  enrollmentUpdateSchema,
} from "@/lib/validation";
import { z } from "zod";

export async function listClasses(user: SessionUser, params: { q?: string; status?: string; teacherId?: string }) {
  const where: Prisma.DanceClassWhereInput = { deletedAt: null };
  where.teacherId = scopeTeacherId(user, params.teacherId);
  if (params.status) where.status = params.status;
  if (params.q) where.OR = [{ name: { contains: params.q } }, { style: { contains: params.q } }];
  const classes = await prisma.danceClass.findMany({
    where,
    include: {
      teacher: { select: { fullName: true } },
      _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });
  return classes;
}

export async function getClass(user: SessionUser, id: string) {
  return orNotFound(
    await prisma.danceClass.findFirst({
      where: { id, deletedAt: null, teacherId: scopeTeacherId(user) },
      include: {
        teacher: true,
        enrollments: { include: { student: true }, orderBy: [{ status: "asc" }, { enrolledAt: "desc" }] },
      },
    }),
    "Class"
  );
}

function toData(input: z.infer<typeof classCreateSchema>) {
  const { fee, ...rest } = input;
  return { ...rest, feeCents: fee, dayOfWeek: input.dayOfWeek ?? null };
}

export async function createClass(user: SessionUser, input: z.infer<typeof classCreateSchema>) {
  const teacher = await prisma.teacher.findFirst({ where: { id: input.teacherId, deletedAt: null } });
  if (!teacher) throw new ApiError(400, "Selected teacher does not exist");
  const cls = await prisma.danceClass.create({ data: toData(input) });
  await logAudit(user, {
    action: "CREATE",
    entityType: "DanceClass",
    entityId: cls.id,
    summary: `Created class ${cls.name}`,
  });
  return cls;
}

export async function updateClass(user: SessionUser, id: string, input: z.infer<typeof classUpdateSchema>) {
  const existing = orNotFound(await prisma.danceClass.findFirst({ where: { id, deletedAt: null } }), "Class");
  const { fee, ...rest } = input;
  const data: Record<string, unknown> = { ...rest };
  if (fee !== undefined) data.feeCents = fee;

  const cls = await prisma.danceClass.update({ where: { id }, data });
  const changes = diffChanges(existing as Record<string, unknown>, data);
  await logAudit(user, {
    action: "UPDATE",
    entityType: "DanceClass",
    entityId: id,
    summary: `Updated class ${cls.name}`,
    changes,
  });
  return cls;
}

export async function softDeleteClass(user: SessionUser, id: string) {
  const existing = orNotFound(await prisma.danceClass.findFirst({ where: { id, deletedAt: null } }), "Class");
  await prisma.$transaction([
    prisma.danceClass.update({ where: { id }, data: { deletedAt: new Date(), status: "INACTIVE" } }),
    prisma.enrollment.updateMany({
      where: { classId: id, status: "ACTIVE" },
      data: { status: "DROPPED", droppedAt: new Date() },
    }),
  ]);
  await logAudit(user, {
    action: "DELETE",
    entityType: "DanceClass",
    entityId: id,
    summary: `Deleted (archived) class ${existing.name} and dropped its active enrollments`,
  });
}

// --- enrollments -------------------------------------------------------------

export async function enrollStudent(user: SessionUser, input: z.infer<typeof enrollmentCreateSchema>) {
  const [student, cls] = await Promise.all([
    prisma.student.findFirst({ where: { id: input.studentId, deletedAt: null } }),
    prisma.danceClass.findFirst({
      where: { id: input.classId, deletedAt: null },
      include: { _count: { select: { enrollments: { where: { status: "ACTIVE" } } } } },
    }),
  ]);
  if (!student) throw new ApiError(400, "Student not found");
  if (!cls) throw new ApiError(400, "Class not found");
  if (cls.status !== "ACTIVE") throw new ApiError(409, "This class is not open for enrollment");
  if (cls._count.enrollments >= cls.capacity) {
    throw new ApiError(409, `Class is full (capacity ${cls.capacity})`);
  }
  const duplicate = await prisma.enrollment.findFirst({
    where: { studentId: input.studentId, classId: input.classId, status: "ACTIVE" },
  });
  if (duplicate) throw new ApiError(409, `${student.fullName} is already enrolled in this class`);

  const enrollment = await prisma.enrollment.create({
    data: {
      studentId: input.studentId,
      classId: input.classId,
      enrolledAt: parseDateInput(input.enrolledAt),
      notes: input.notes,
    },
  });
  await logAudit(user, {
    action: "CREATE",
    entityType: "Enrollment",
    entityId: enrollment.id,
    summary: `Enrolled ${student.fullName} in ${cls.name}`,
  });
  return enrollment;
}

export async function updateEnrollment(user: SessionUser, id: string, input: z.infer<typeof enrollmentUpdateSchema>) {
  const existing = await prisma.enrollment.findUnique({
    where: { id },
    include: { student: true, class: true },
  });
  if (!existing) throw new ApiError(404, "Enrollment not found");
  const data: Record<string, unknown> = { status: input.status, notes: input.notes ?? existing.notes };
  if (input.status === "DROPPED") {
    data.droppedAt = input.droppedAt ? parseDateInput(input.droppedAt) : new Date();
  }
  const enrollment = await prisma.enrollment.update({ where: { id }, data });
  await logAudit(user, {
    action: "STATUS_CHANGE",
    entityType: "Enrollment",
    entityId: id,
    summary: `${existing.student.fullName} in ${existing.class.name}: ${existing.status} → ${input.status}`,
  });
  return enrollment;
}

export async function classOptions(user: SessionUser) {
  return prisma.danceClass.findMany({
    where: { deletedAt: null, status: "ACTIVE", teacherId: scopeTeacherId(user) },
    select: { id: true, name: true, style: true, teacherId: true },
    orderBy: { name: "asc" },
  });
}
