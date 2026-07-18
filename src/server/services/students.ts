import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { SessionUser } from "@/lib/auth";
import { orNotFound } from "@/lib/api-error";
import { logAudit, diffChanges } from "@/lib/audit";
import { parseDateInput } from "@/lib/dates";
import { paginate, pageCount } from "@/lib/paginate";
import { studentCreateSchema, studentUpdateSchema } from "@/lib/validation";
import { OUTSTANDING_WHERE } from "./payments";
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
  const { page, pageSize, skip, take } = paginate(params);
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
    prisma.student.findMany({ where, orderBy, skip, take }),
  ]);
  return { students, total, page, pageSize, pages: pageCount(total, pageSize) };
}

export async function getStudent(id: string) {
  const [student, outstanding] = await Promise.all([
    prisma.student.findFirst({
      where: { id, deletedAt: null },
      include: {
        payments: { where: { deletedAt: null }, orderBy: { paymentDate: "desc" }, take: 50 },
        enrollments: {
          include: { class: { select: { id: true, name: true, teacher: { select: { fullName: true } } } } },
          orderBy: { enrolledAt: "desc" },
        },
        attendance: { include: { class: { select: { name: true } } }, orderBy: { sessionDate: "desc" }, take: 20 },
      },
    }),
    prisma.payment.aggregate({
      where: { studentId: id, ...OUTSTANDING_WHERE },
      _sum: { amountCents: true },
    }),
  ]);
  return { ...orNotFound(student, "Student"), outstandingCents: outstanding._sum.amountCents ?? 0 };
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
  const existing = orNotFound(await prisma.student.findFirst({ where: { id, deletedAt: null } }), "Student");
  const data: Record<string, unknown> = { ...input };
  if (input.dateOfBirth !== undefined) data.dateOfBirth = input.dateOfBirth ? parseDateInput(input.dateOfBirth) : null;
  if (input.enrollmentDate !== undefined) data.enrollmentDate = parseDateInput(input.enrollmentDate);

  const student = await prisma.student.update({ where: { id }, data });
  const changes = diffChanges(existing as Record<string, unknown>, data);
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
  const existing = orNotFound(await prisma.student.findFirst({ where: { id, deletedAt: null } }), "Student");
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
