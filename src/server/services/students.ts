import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { SessionUser } from "@/lib/auth";
import { ApiError } from "@/lib/api-error";
import { logAudit, diffChanges } from "@/lib/audit";
import { parseDateInput } from "@/lib/dates";
import { studentCreateSchema, studentUpdateSchema } from "@/lib/validation";
import { z } from "zod";

export interface StudentListParams {
  q?: string;
  status?: string;
  sort?: "fullName" | "enrollmentDate" | "createdAt";
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export async function listStudents(params: StudentListParams) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
  const where: Prisma.StudentWhereInput = { deletedAt: null };
  if (params.status) where.status = params.status;
  if (params.q) {
    where.OR = [
      { fullName: { contains: params.q } },
      { contactNumber: { contains: params.q } },
      { email: { contains: params.q } },
      { guardianName: { contains: params.q } },
    ];
  }
  const orderBy = { [params.sort ?? "fullName"]: params.order ?? "asc" };
  const [total, students] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
  ]);
  return { students, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getStudent(id: string) {
  const student = await prisma.student.findFirst({
    where: { id, deletedAt: null },
    include: {
      payments: { where: { deletedAt: null }, orderBy: { paymentDate: "desc" }, take: 50 },
      enrollments: { include: { class: { include: { teacher: true } } }, orderBy: { enrolledAt: "desc" } },
      attendance: { include: { class: true }, orderBy: { sessionDate: "desc" }, take: 20 },
    },
  });
  if (!student) throw new ApiError(404, "Student not found");
  const outstanding = await prisma.payment.aggregate({
    where: { studentId: id, deletedAt: null, status: { in: ["PENDING", "OVERDUE"] } },
    _sum: { amountCents: true },
  });
  return { ...student, outstandingCents: outstanding._sum.amountCents ?? 0 };
}

function toData(input: z.infer<typeof studentCreateSchema>) {
  return {
    ...input,
    dateOfBirth: input.dateOfBirth ? parseDateInput(input.dateOfBirth) : null,
    enrollmentDate: parseDateInput(input.enrollmentDate),
  };
}

export async function createStudent(user: SessionUser, input: z.infer<typeof studentCreateSchema>) {
  const student = await prisma.student.create({ data: toData(input) });
  await logAudit(user, {
    action: "CREATE",
    entityType: "Student",
    entityId: student.id,
    summary: `Created student ${student.fullName}`,
  });
  return student;
}

export async function updateStudent(user: SessionUser, id: string, input: z.infer<typeof studentUpdateSchema>) {
  const existing = await prisma.student.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new ApiError(404, "Student not found");
  const data: Record<string, unknown> = { ...input };
  if (input.dateOfBirth !== undefined) data.dateOfBirth = input.dateOfBirth ? parseDateInput(input.dateOfBirth) : null;
  if (input.enrollmentDate !== undefined) data.enrollmentDate = parseDateInput(input.enrollmentDate);

  const student = await prisma.student.update({ where: { id }, data });
  const changes = diffChanges(existing as Record<string, unknown>, data, [
    "fullName", "contactNumber", "email", "dateOfBirth", "guardianName", "guardianPhone",
    "address", "enrollmentDate", "status", "notes", "medicalNotes",
  ]);
  await logAudit(user, {
    action: "UPDATE",
    entityType: "Student",
    entityId: id,
    summary: `Updated student ${student.fullName}`,
    changes,
  });
  return student;
}

/** Soft delete — the record and its financial history remain in the database. */
export async function softDeleteStudent(user: SessionUser, id: string) {
  const existing = await prisma.student.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new ApiError(404, "Student not found");
  await prisma.student.update({ where: { id }, data: { deletedAt: new Date(), status: "INACTIVE" } });
  await logAudit(user, {
    action: "DELETE",
    entityType: "Student",
    entityId: id,
    summary: `Deleted (archived) student ${existing.fullName}`,
  });
}

/** Lightweight list for dropdowns. */
export async function studentOptions() {
  return prisma.student.findMany({
    where: { deletedAt: null, status: { in: ["ACTIVE", "SUSPENDED"] } },
    select: { id: true, fullName: true, contactNumber: true },
    orderBy: { fullName: "asc" },
  });
}
