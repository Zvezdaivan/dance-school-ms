import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { SessionUser } from "@/lib/auth";
import { ApiError, orNotFound } from "@/lib/api-error";
import { logAudit, diffChanges } from "@/lib/audit";
import { dateRangeFilter, parseDateInput } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { paginate, pageCount } from "@/lib/paginate";
import { paymentCreateSchema, paymentUpdateSchema } from "@/lib/validation";
import { z } from "zod";

/** The single business definition of an outstanding payment. */
export const OUTSTANDING_WHERE = {
  deletedAt: null,
  status: { in: ["PENDING", "OVERDUE"] },
} satisfies Prisma.PaymentWhereInput;

export interface PaymentListParams {
  studentId?: string;
  status?: string;
  method?: string;
  paymentType?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

function paymentWhere(params: PaymentListParams): Prisma.PaymentWhereInput {
  const where: Prisma.PaymentWhereInput = { deletedAt: null };
  if (params.studentId) where.studentId = params.studentId;
  if (params.status) where.status = params.status;
  if (params.method) where.method = params.method;
  if (params.paymentType) where.paymentType = params.paymentType;
  where.paymentDate = dateRangeFilter(params);
  return where;
}

export async function listPayments(params: PaymentListParams) {
  const { page, pageSize, skip, take } = paginate(params);
  const where = paymentWhere(params);
  const [total, payments, sums] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      include: { student: { select: { fullName: true } } },
      orderBy: { paymentDate: "desc" },
      skip,
      take,
    }),
    prisma.payment.groupBy({ by: ["status"], where, _sum: { amountCents: true } }),
  ]);
  const totals: Record<string, number> = {};
  for (const s of sums) totals[s.status] = s._sum.amountCents ?? 0;
  return { payments, total, page, pageSize, pages: pageCount(total, pageSize), totals };
}

/** Outstanding = PENDING + OVERDUE payments, grouped per student. */
export async function outstandingByStudent() {
  const rows = await prisma.payment.findMany({
    where: OUTSTANDING_WHERE,
    include: { student: { select: { id: true, fullName: true, contactNumber: true } } },
    orderBy: { paymentDate: "asc" },
  });
  const byStudent = new Map<
    string,
    { student: { id: string; fullName: string; contactNumber: string }; items: typeof rows; totalCents: number }
  >();
  for (const p of rows) {
    const entry = byStudent.get(p.studentId) ?? { student: p.student, items: [], totalCents: 0 };
    entry.items.push(p);
    entry.totalCents += p.amountCents;
    byStudent.set(p.studentId, entry);
  }
  return [...byStudent.values()].sort((a, b) => b.totalCents - a.totalCents);
}

async function generateReceiptNumber(paymentDate: Date): Promise<string> {
  const ymd = paymentDate.toISOString().slice(0, 10).replace(/-/g, "");
  const count = await prisma.payment.count({
    where: { paymentDate },
  });
  return `RCP-${ymd}-${String(count + 1).padStart(3, "0")}`;
}

export async function createPayment(user: SessionUser, input: z.infer<typeof paymentCreateSchema>) {
  const student = await prisma.student.findFirst({ where: { id: input.studentId, deletedAt: null } });
  if (!student) throw new ApiError(400, "Student not found");
  const paymentDate = parseDateInput(input.paymentDate);
  const { amount, ...rest } = input;

  // Retry a couple of times in case of a receipt-number collision.
  for (let attempt = 0; ; attempt++) {
    const receiptNumber = input.receiptNumber?.trim() || (await generateReceiptNumber(paymentDate)) + (attempt ? `-${attempt}` : "");
    try {
      const payment = await prisma.payment.create({
        data: { ...rest, amountCents: amount, paymentDate, receiptNumber, recordedById: user.id },
      });
      await logAudit(user, {
        action: "CREATE",
        entityType: "Payment",
        entityId: payment.id,
        summary: `Recorded ${payment.status.toLowerCase()} payment ${payment.receiptNumber} for ${student.fullName}: ${formatCents(payment.amountCents)}`,
      });
      return payment;
    } catch (err) {
      const isUniqueHit = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
      if (!isUniqueHit || input.receiptNumber || attempt >= 3) throw err;
    }
  }
}

export async function updatePayment(user: SessionUser, id: string, input: z.infer<typeof paymentUpdateSchema>) {
  const existing = orNotFound(
    await prisma.payment.findFirst({ where: { id, deletedAt: null }, include: { student: true } }),
    "Payment"
  );
  const { amount, paymentDate, ...rest } = input;
  const data: Record<string, unknown> = { ...rest };
  if (amount !== undefined) data.amountCents = amount;
  if (paymentDate !== undefined) data.paymentDate = parseDateInput(paymentDate);

  const payment = await prisma.payment.update({ where: { id }, data });
  const changes = diffChanges(existing as unknown as Record<string, unknown>, data);
  await logAudit(user, {
    action: "UPDATE",
    entityType: "Payment",
    entityId: id,
    summary: `Updated payment ${existing.receiptNumber} (${existing.student.fullName})`,
    changes,
  });
  return payment;
}

/** Payments are voided (soft-deleted), never removed — the financial trail stays intact. */
export async function voidPayment(user: SessionUser, id: string) {
  const existing = orNotFound(
    await prisma.payment.findFirst({ where: { id, deletedAt: null }, include: { student: true } }),
    "Payment"
  );
  await prisma.payment.update({ where: { id }, data: { deletedAt: new Date() } });
  await logAudit(user, {
    action: "DELETE",
    entityType: "Payment",
    entityId: id,
    summary: `Voided payment ${existing.receiptNumber} (${existing.student.fullName}, ${formatCents(existing.amountCents)})`,
  });
}
