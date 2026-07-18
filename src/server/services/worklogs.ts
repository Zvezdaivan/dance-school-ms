import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { scopeTeacherId, SessionUser } from "@/lib/auth";
import { ApiError, orNotFound } from "@/lib/api-error";
import { logAudit, diffChanges } from "@/lib/audit";
import { fmtDate, minutesToHoursLabel, monthOf, monthRange, parseDateInput } from "@/lib/dates";
import { paginate, pageCount } from "@/lib/paginate";
import { computePayableMinutes } from "@/lib/payroll-calc";
import { workLogCreateSchema, workLogUpdateSchema } from "@/lib/validation";
import { z } from "zod";

export interface WorkLogListParams {
  teacherId?: string;
  approvalStatus?: string;
  month?: string; // "YYYY-MM"
  page?: number;
  pageSize?: number;
}

export async function listWorkLogs(user: SessionUser, params: WorkLogListParams) {
  const { page, pageSize, skip, take } = paginate(params, 25);
  const where: Prisma.WorkLogWhereInput = { deletedAt: null };
  const teacherId = scopeTeacherId(user, params.teacherId);
  if (teacherId) where.teacherId = teacherId;
  if (params.approvalStatus) where.approvalStatus = params.approvalStatus;
  if (params.month) {
    const { start, end } = monthRange(params.month);
    where.workDate = { gte: start, lt: end };
  }
  const [total, logs, minuteSum] = await Promise.all([
    prisma.workLog.count({ where }),
    prisma.workLog.findMany({
      where,
      include: { teacher: { select: { fullName: true } }, class: { select: { name: true } } },
      orderBy: [{ workDate: "desc" }, { startTime: "desc" }],
      skip,
      take,
    }),
    prisma.workLog.aggregate({ where: { ...where, approvalStatus: "APPROVED" }, _sum: { payableMinutes: true } }),
  ]);
  return {
    logs,
    total,
    page,
    pageSize,
    pages: pageCount(total, pageSize),
    approvedMinutes: minuteSum._sum.payableMinutes ?? 0,
  };
}

/** Single work log, teacher-scoped — for the edit page. */
export async function getWorkLog(user: SessionUser, id: string) {
  return orNotFound(
    await prisma.workLog.findFirst({
      where: { id, deletedAt: null, teacherId: scopeTeacherId(user) },
      include: { teacher: { select: { fullName: true } } },
    }),
    "Work log"
  );
}

/** Monthly summary per teacher (for review/approval screens). */
export async function monthlySummary(month: string) {
  const { start, end } = monthRange(month);
  const grouped = await prisma.workLog.groupBy({
    by: ["teacherId", "approvalStatus"],
    where: { deletedAt: null, workDate: { gte: start, lt: end } },
    _sum: { payableMinutes: true },
    _count: true,
  });
  const teachers = await prisma.teacher.findMany({
    where: { id: { in: [...new Set(grouped.map((g) => g.teacherId))] } },
    select: { id: true, fullName: true, employmentType: true },
  });
  const byId = new Map(teachers.map((t) => [t.id, t]));
  const summary = new Map<
    string,
    { teacher: { id: string; fullName: string; employmentType: string }; minutes: Record<string, number>; count: number }
  >();
  for (const g of grouped) {
    const teacher = byId.get(g.teacherId);
    if (!teacher) continue;
    const entry = summary.get(g.teacherId) ?? { teacher, minutes: {}, count: 0 };
    entry.minutes[g.approvalStatus] = g._sum.payableMinutes ?? 0;
    entry.count += g._count;
    summary.set(g.teacherId, entry);
  }
  return [...summary.values()].sort((a, b) => a.teacher.fullName.localeCompare(b.teacher.fullName));
}

/** A work log is locked once its month's payroll is APPROVED or PAID. */
async function assertMonthOpen(teacherId: string, workDate: Date) {
  const payroll = await prisma.payrollRecord.findUnique({
    where: { teacherId_month: { teacherId, month: monthOf(workDate) } },
  });
  if (payroll && payroll.status !== "DRAFT") {
    throw new ApiError(409, `Payroll for ${payroll.month} is already ${payroll.status.toLowerCase()} — work hours for that month are locked`);
  }
}

export async function createWorkLog(user: SessionUser, input: z.infer<typeof workLogCreateSchema>) {
  const teacherId = scopeTeacherId(user, input.teacherId) ?? input.teacherId;
  if (user.role === "TEACHER" && input.teacherId && input.teacherId !== teacherId) {
    throw new ApiError(403, "Teachers can only log their own hours");
  }
  const teacher = await prisma.teacher.findFirst({ where: { id: teacherId, deletedAt: null } });
  if (!teacher) throw new ApiError(400, "Teacher not found");
  const workDate = parseDateInput(input.workDate);
  await assertMonthOpen(teacherId, workDate);
  const payableMinutes = computePayableMinutes(input.startTime, input.endTime, input.breakMinutes);

  const log = await prisma.workLog.create({
    data: {
      teacherId,
      classId: input.classId ?? null,
      workDate,
      startTime: input.startTime,
      endTime: input.endTime,
      breakMinutes: input.breakMinutes,
      payableMinutes,
      remarks: input.remarks,
    },
  });
  await logAudit(user, {
    action: "CREATE",
    entityType: "WorkLog",
    entityId: log.id,
    summary: `Logged ${minutesToHoursLabel(payableMinutes)}h for ${teacher.fullName} on ${input.workDate}`,
  });
  return log;
}

export async function updateWorkLog(user: SessionUser, id: string, input: z.infer<typeof workLogUpdateSchema>) {
  const existing = orNotFound(
    await prisma.workLog.findFirst({
      where: { id, deletedAt: null },
      include: { teacher: { select: { fullName: true } } },
    }),
    "Work log"
  );
  if (user.role === "TEACHER") {
    if (existing.teacherId !== user.teacherId) throw new ApiError(403, "Teachers can only edit their own hours");
    if (existing.approvalStatus !== "PENDING") throw new ApiError(409, "This record has been reviewed and can no longer be edited");
    if (input.adjustedMinutes !== undefined) throw new ApiError(403, "Manual adjustments require a manager");
  }
  await assertMonthOpen(existing.teacherId, existing.workDate);

  const workDate = input.workDate ? parseDateInput(input.workDate) : existing.workDate;
  const startTime = input.startTime ?? existing.startTime;
  const endTime = input.endTime ?? existing.endTime;
  const breakMinutes = input.breakMinutes ?? existing.breakMinutes;
  const computed = computePayableMinutes(startTime, endTime, breakMinutes);

  // Manual adjustment overrides the computed value and requires a reason.
  const adjustedMinutes = input.adjustedMinutes !== undefined ? input.adjustedMinutes : existing.adjustedMinutes;
  const adjustmentReason = input.adjustmentReason !== undefined ? input.adjustmentReason : existing.adjustmentReason;
  if (adjustedMinutes != null && !adjustmentReason) {
    throw new ApiError(400, "A reason is required when manually adjusting payable hours");
  }

  const data = {
    classId: input.classId !== undefined ? input.classId : existing.classId,
    workDate,
    startTime,
    endTime,
    breakMinutes,
    payableMinutes: adjustedMinutes ?? computed,
    adjustedMinutes,
    adjustmentReason,
    remarks: input.remarks !== undefined ? input.remarks : existing.remarks,
    // Any edit sends the record back for re-approval.
    approvalStatus: "PENDING",
    approvedById: null,
    approvedAt: null,
  };
  const log = await prisma.workLog.update({ where: { id }, data });
  const changes = diffChanges(existing as unknown as Record<string, unknown>, data, [
    "approvalStatus", "approvedById", "approvedAt", // routine reset noise, not user edits
  ]);
  await logAudit(user, {
    action: "UPDATE",
    entityType: "WorkLog",
    entityId: id,
    summary: `Updated work log for ${existing.teacher.fullName} (${fmtDate(existing.workDate)}) — reset to pending`,
    changes,
  });
  return log;
}

export async function decideWorkLog(user: SessionUser, id: string, decision: "APPROVED" | "REJECTED") {
  const existing = orNotFound(
    await prisma.workLog.findFirst({
      where: { id, deletedAt: null },
      include: { teacher: { select: { fullName: true } } },
    }),
    "Work log"
  );
  await assertMonthOpen(existing.teacherId, existing.workDate);

  const log = await prisma.workLog.update({
    where: { id },
    data: { approvalStatus: decision, approvedById: user.id, approvedAt: new Date() },
  });
  await logAudit(user, {
    action: decision === "APPROVED" ? "APPROVE" : "REJECT",
    entityType: "WorkLog",
    entityId: id,
    summary: `${decision === "APPROVED" ? "Approved" : "Rejected"} ${minutesToHoursLabel(existing.payableMinutes)}h for ${existing.teacher.fullName} on ${fmtDate(existing.workDate)}`,
  });
  return log;
}

export async function softDeleteWorkLog(user: SessionUser, id: string) {
  const existing = orNotFound(
    await prisma.workLog.findFirst({
      where: { id, deletedAt: null },
      include: { teacher: { select: { fullName: true } } },
    }),
    "Work log"
  );
  if (user.role === "TEACHER") {
    if (existing.teacherId !== user.teacherId) throw new ApiError(403, "Teachers can only remove their own hours");
    if (existing.approvalStatus !== "PENDING") throw new ApiError(409, "Reviewed records cannot be removed");
  }
  await assertMonthOpen(existing.teacherId, existing.workDate);
  await prisma.workLog.update({ where: { id }, data: { deletedAt: new Date() } });
  await logAudit(user, {
    action: "DELETE",
    entityType: "WorkLog",
    entityId: id,
    summary: `Deleted work log for ${existing.teacher.fullName} on ${fmtDate(existing.workDate)}`,
  });
}
