import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { SessionUser } from "@/lib/auth";
import { ApiError } from "@/lib/api-error";
import { logAudit, diffChanges } from "@/lib/audit";
import { parseDateInput } from "@/lib/dates";
import { teacherCreateSchema, teacherUpdateSchema } from "@/lib/validation";
import { z } from "zod";

export async function listTeachers(params: { q?: string; status?: string; employmentType?: string }) {
  const where: Prisma.TeacherWhereInput = { deletedAt: null };
  if (params.status) where.status = params.status;
  if (params.employmentType) where.employmentType = params.employmentType;
  if (params.q) {
    where.OR = [
      { fullName: { contains: params.q } },
      { contactNumber: { contains: params.q } },
      { email: { contains: params.q } },
    ];
  }
  return prisma.teacher.findMany({ where, orderBy: { fullName: "asc" } });
}

export async function getTeacher(id: string) {
  const teacher = await prisma.teacher.findFirst({
    where: { id, deletedAt: null },
    include: {
      classes: { where: { deletedAt: null }, orderBy: { name: "asc" } },
      workLogs: { where: { deletedAt: null }, orderBy: { workDate: "desc" }, take: 20, include: { class: true } },
      payrolls: { orderBy: { month: "desc" }, take: 12 },
    },
  });
  if (!teacher) throw new ApiError(404, "Teacher not found");
  return teacher;
}

function toData(input: z.infer<typeof teacherCreateSchema>) {
  const { hourlyRate, monthlySalary, startDate, ...rest } = input;
  return {
    ...rest,
    hourlyRateCents: hourlyRate ?? null,
    monthlySalaryCents: monthlySalary ?? null,
    startDate: parseDateInput(startDate),
  };
}

export async function createTeacher(user: SessionUser, input: z.infer<typeof teacherCreateSchema>) {
  const teacher = await prisma.teacher.create({ data: toData(input) });
  await logAudit(user, {
    action: "CREATE",
    entityType: "Teacher",
    entityId: teacher.id,
    summary: `Created teacher ${teacher.fullName}`,
  });
  return teacher;
}

export async function updateTeacher(user: SessionUser, id: string, input: z.infer<typeof teacherUpdateSchema>) {
  const existing = await prisma.teacher.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new ApiError(404, "Teacher not found");
  const { hourlyRate, monthlySalary, startDate, ...rest } = input;
  const data: Record<string, unknown> = { ...rest };
  if (hourlyRate !== undefined) data.hourlyRateCents = hourlyRate;
  if (monthlySalary !== undefined) data.monthlySalaryCents = monthlySalary;
  if (startDate !== undefined) data.startDate = parseDateInput(startDate);

  const teacher = await prisma.teacher.update({ where: { id }, data });
  const changes = diffChanges(existing as Record<string, unknown>, data, [
    "fullName", "contactNumber", "email", "employmentType", "hourlyRateCents", "monthlySalaryCents",
    "bankName", "bankAccountName", "bankAccountNumber", "startDate", "status", "notes",
  ]);
  await logAudit(user, {
    action: "UPDATE",
    entityType: "Teacher",
    entityId: id,
    summary: `Updated teacher ${teacher.fullName}`,
    changes,
  });
  return teacher;
}

export async function softDeleteTeacher(user: SessionUser, id: string) {
  const existing = await prisma.teacher.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new ApiError(404, "Teacher not found");
  const activeClasses = await prisma.danceClass.count({
    where: { teacherId: id, deletedAt: null, status: "ACTIVE" },
  });
  if (activeClasses > 0) {
    throw new ApiError(409, "This teacher still has active classes. Reassign or close them first.");
  }
  await prisma.teacher.update({ where: { id }, data: { deletedAt: new Date(), status: "INACTIVE" } });
  await logAudit(user, {
    action: "DELETE",
    entityType: "Teacher",
    entityId: id,
    summary: `Deleted (archived) teacher ${existing.fullName}`,
  });
}

export async function teacherOptions() {
  return prisma.teacher.findMany({
    where: { deletedAt: null, status: "ACTIVE" },
    select: { id: true, fullName: true, employmentType: true },
    orderBy: { fullName: "asc" },
  });
}
