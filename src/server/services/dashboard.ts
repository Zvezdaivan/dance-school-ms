import { prisma } from "@/lib/db";
import { currentMonth, monthRange } from "@/lib/dates";
import { OUTSTANDING_WHERE } from "./payments";

export async function getDashboardData() {
  const month = currentMonth();
  const { start, end } = monthRange(month);
  const today = new Date();
  const dayOfWeek = today.getDay();

  const [
    activeStudents,
    monthIncome,
    outstanding,
    overdueCount,
    pendingApprovals,
    payrollSummary,
    recentPayments,
    upcomingClasses,
    draftPayrolls,
  ] = await Promise.all([
    prisma.student.count({ where: { deletedAt: null, status: "ACTIVE" } }),
    prisma.payment.aggregate({
      where: { deletedAt: null, status: "PAID", paymentDate: { gte: start, lt: end } },
      _sum: { amountCents: true },
    }),
    prisma.payment.aggregate({
      where: OUTSTANDING_WHERE,
      _sum: { amountCents: true },
      _count: true,
    }),
    prisma.payment.count({ where: { deletedAt: null, status: "OVERDUE" } }),
    prisma.workLog.count({ where: { deletedAt: null, approvalStatus: "PENDING" } }),
    prisma.payrollRecord.groupBy({
      by: ["status"],
      where: { month },
      _sum: { netPayCents: true },
      _count: true,
    }),
    prisma.payment.findMany({
      where: { deletedAt: null },
      include: { student: { select: { fullName: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.danceClass.findMany({
      where: { deletedAt: null, status: "ACTIVE", dayOfWeek: { not: null } },
      include: {
        teacher: { select: { fullName: true } },
        _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
      },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    }),
    prisma.payrollRecord.count({ where: { month, status: "DRAFT" } }),
  ]);

  // Order classes starting from today's weekday.
  const ordered = [...upcomingClasses].sort((a, b) => {
    const da = ((a.dayOfWeek ?? 0) - dayOfWeek + 7) % 7;
    const db = ((b.dayOfWeek ?? 0) - dayOfWeek + 7) % 7;
    return da - db || (a.startTime ?? "").localeCompare(b.startTime ?? "");
  });

  return {
    month,
    activeStudents,
    monthIncomeCents: monthIncome._sum.amountCents ?? 0,
    outstandingCents: outstanding._sum.amountCents ?? 0,
    outstandingCount: outstanding._count,
    overdueCount,
    pendingApprovals,
    payrollSummary: payrollSummary.map((p) => ({
      status: p.status,
      count: p._count,
      netCents: p._sum.netPayCents ?? 0,
    })),
    draftPayrolls,
    recentPayments,
    upcomingClasses: ordered.slice(0, 6),
  };
}
