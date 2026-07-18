import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { scopeTeacherId, SessionUser } from "@/lib/auth";
import { ApiError, orNotFound } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";
import { monthRange, parseDateInput } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { computeBasePayCents, computePayrollTotals } from "@/lib/payroll-calc";
import { payrollAdjustmentSchema, payrollStatusSchema } from "@/lib/validation";
import { z } from "zod";

export async function listPayrolls(user: SessionUser, params: { month?: string; status?: string; teacherId?: string }) {
  const where: Prisma.PayrollRecordWhereInput = {};
  where.teacherId = scopeTeacherId(user, params.teacherId);
  if (params.month) where.month = params.month;
  if (params.status) where.status = params.status;
  const [records, sums] = await Promise.all([
    prisma.payrollRecord.findMany({
      where,
      include: { teacher: { select: { fullName: true, employmentType: true } } },
      orderBy: [{ month: "desc" }, { createdAt: "asc" }],
    }),
    prisma.payrollRecord.aggregate({ where, _sum: { grossPayCents: true, netPayCents: true } }),
  ]);
  return {
    records,
    totalGrossCents: sums._sum.grossPayCents ?? 0,
    totalNetCents: sums._sum.netPayCents ?? 0,
  };
}

export async function getPayroll(user: SessionUser, id: string) {
  const record = orNotFound(
    await prisma.payrollRecord.findUnique({
      where: { id },
      include: { teacher: true, adjustments: { orderBy: { createdAt: "asc" } } },
    }),
    "Payroll record"
  );
  if (user.role === "TEACHER" && record.teacherId !== user.teacherId) {
    throw new ApiError(403, "You can only view your own payroll");
  }
  return record;
}

/**
 * Generate (or regenerate) draft payroll for a month.
 * - Hourly/contractor: approved payable minutes x hourly rate.
 * - Monthly: fixed salary.
 * - Existing DRAFT records are recalculated (adjustments are kept).
 * - APPROVED/PAID records are never touched.
 */
export async function generatePayroll(user: SessionUser, month: string, teacherId?: string) {
  const { start, end } = monthRange(month);
  const teachers = await prisma.teacher.findMany({
    where: teacherId ? { id: teacherId, deletedAt: null } : { deletedAt: null, status: "ACTIVE" },
  });
  if (teachers.length === 0) throw new ApiError(400, "No matching teachers found");
  const teacherIds = teachers.map((t) => t.id);

  // Batch the per-teacher reads: existing records + approved minutes in two queries.
  const [existingRecords, minuteSums] = await Promise.all([
    prisma.payrollRecord.findMany({
      where: { month, teacherId: { in: teacherIds } },
      include: { adjustments: true },
    }),
    prisma.workLog.groupBy({
      by: ["teacherId"],
      where: { teacherId: { in: teacherIds }, deletedAt: null, approvalStatus: "APPROVED", workDate: { gte: start, lt: end } },
      _sum: { payableMinutes: true },
    }),
  ]);
  const existingByTeacher = new Map(existingRecords.map((r) => [r.teacherId, r]));
  const minutesByTeacher = new Map(minuteSums.map((m) => [m.teacherId, m._sum.payableMinutes ?? 0]));

  const results = { created: [] as string[], updated: [] as string[], skipped: [] as string[] };

  for (const teacher of teachers) {
    const existing = existingByTeacher.get(teacher.id);
    if (existing && existing.status !== "DRAFT") {
      results.skipped.push(`${teacher.fullName} (already ${existing.status.toLowerCase()})`);
      continue;
    }

    const totalMinutes = minutesByTeacher.get(teacher.id) ?? 0;

    // Hourly teachers with no approved hours produce no payroll line.
    if (teacher.employmentType !== "MONTHLY" && totalMinutes === 0 && !existing) {
      results.skipped.push(`${teacher.fullName} (no approved hours)`);
      continue;
    }

    const basePayCents = computeBasePayCents({
      employmentType: teacher.employmentType,
      hourlyRateCents: teacher.hourlyRateCents,
      monthlySalaryCents: teacher.monthlySalaryCents,
      totalMinutes,
    });
    const totals = computePayrollTotals(basePayCents, existing?.adjustments ?? []);
    const data = {
      employmentType: teacher.employmentType,
      hourlyRateCents: teacher.employmentType === "MONTHLY" ? null : teacher.hourlyRateCents,
      totalMinutes,
      basePayCents,
      ...totals,
    };

    if (existing) {
      await prisma.payrollRecord.update({ where: { id: existing.id }, data });
      results.updated.push(teacher.fullName);
      await logAudit(user, {
        action: "UPDATE",
        entityType: "PayrollRecord",
        entityId: existing.id,
        summary: `Regenerated draft payroll ${month} for ${teacher.fullName}: net ${formatCents(totals.netPayCents)}`,
      });
    } else {
      const record = await prisma.payrollRecord.create({
        data: { ...data, teacherId: teacher.id, month, generatedById: user.id },
      });
      results.created.push(teacher.fullName);
      await logAudit(user, {
        action: "CREATE",
        entityType: "PayrollRecord",
        entityId: record.id,
        summary: `Generated draft payroll ${month} for ${teacher.fullName}: net ${formatCents(totals.netPayCents)}`,
      });
    }
  }
  return results;
}

async function recalcTotals(payrollId: string) {
  const record = await prisma.payrollRecord.findUniqueOrThrow({
    where: { id: payrollId },
    include: { adjustments: true },
  });
  const totals = computePayrollTotals(record.basePayCents, record.adjustments);
  return prisma.payrollRecord.update({ where: { id: payrollId }, data: totals });
}

export async function addAdjustment(user: SessionUser, payrollId: string, input: z.infer<typeof payrollAdjustmentSchema>) {
  const record = orNotFound(
    await prisma.payrollRecord.findUnique({ where: { id: payrollId }, include: { teacher: true } }),
    "Payroll record"
  );
  if (record.status !== "DRAFT") throw new ApiError(409, "Adjustments can only be added to draft payroll (revert to draft first)");

  await prisma.payrollAdjustment.create({
    data: { payrollId, type: input.type, amountCents: input.amount, reason: input.reason, createdById: user.id },
  });
  const updated = await recalcTotals(payrollId);
  await logAudit(user, {
    action: "UPDATE",
    entityType: "PayrollRecord",
    entityId: payrollId,
    summary: `Added ${input.type.toLowerCase()} of ${formatCents(input.amount)} to ${record.teacher.fullName} ${record.month} (${input.reason})`,
  });
  return updated;
}

export async function removeAdjustment(user: SessionUser, payrollId: string, adjustmentId: string) {
  const adjustment = await prisma.payrollAdjustment.findUnique({
    where: { id: adjustmentId },
    include: { payroll: { include: { teacher: true } } },
  });
  if (!adjustment || adjustment.payrollId !== payrollId) throw new ApiError(404, "Adjustment not found");
  if (adjustment.payroll.status !== "DRAFT") throw new ApiError(409, "Adjustments can only be removed from draft payroll");
  await prisma.payrollAdjustment.delete({ where: { id: adjustmentId } });
  const updated = await recalcTotals(payrollId);
  await logAudit(user, {
    action: "UPDATE",
    entityType: "PayrollRecord",
    entityId: payrollId,
    summary: `Removed ${adjustment.type.toLowerCase()} of ${formatCents(adjustment.amountCents)} from ${adjustment.payroll.teacher.fullName} ${adjustment.payroll.month}`,
  });
  return updated;
}

const TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["APPROVED"],
  APPROVED: ["PAID", "DRAFT"],
  PAID: [],
};

export async function setPayrollStatus(user: SessionUser, id: string, input: z.infer<typeof payrollStatusSchema>) {
  const record = orNotFound(
    await prisma.payrollRecord.findUnique({ where: { id }, include: { teacher: true } }),
    "Payroll record"
  );
  if (!TRANSITIONS[record.status]?.includes(input.status)) {
    throw new ApiError(409, `Cannot move payroll from ${record.status} to ${input.status}`);
  }
  const data: Record<string, unknown> = { status: input.status };
  if (input.notes !== undefined) data.notes = input.notes;
  if (input.status === "APPROVED") data.approvedById = user.id;
  if (input.status === "PAID") {
    if (!input.paymentDate || !input.paymentMethod) {
      throw new ApiError(400, "Payment date and method are required to mark payroll as paid");
    }
    data.paymentDate = parseDateInput(input.paymentDate);
    data.paymentMethod = input.paymentMethod;
    data.paidAt = new Date();
  }
  if (input.status === "DRAFT") {
    data.approvedById = null;
  }
  const updated = await prisma.payrollRecord.update({ where: { id }, data });
  await logAudit(user, {
    action: "STATUS_CHANGE",
    entityType: "PayrollRecord",
    entityId: id,
    summary: `Payroll ${record.month} for ${record.teacher.fullName}: ${record.status} → ${input.status}`,
  });
  return updated;
}
