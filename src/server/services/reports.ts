// Report builders: each returns a ReportDefinition consumed by lib/excel.ts.
// Money is emitted as decimal dollars so Excel can sum/format natively.

import { prisma } from "@/lib/db";
import { ReportDefinition } from "@/lib/excel";
import { centsToDollars } from "@/lib/money";
import { fmtDate, minutesToHoursLabel, monthOf, parseDateInput } from "@/lib/dates";
import { label } from "@/lib/constants";
import { ReportType } from "@/lib/validation";
import { SessionUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

interface Range {
  from?: string;
  to?: string;
}

function dateFilter(range: Range) {
  const filter: { gte?: Date; lte?: Date } = {};
  if (range.from) filter.gte = parseDateInput(range.from);
  if (range.to) filter.lte = parseDateInput(range.to);
  return Object.keys(filter).length ? filter : undefined;
}

function rangeLabel(range: Range): string {
  if (range.from && range.to) return `${range.from} to ${range.to}`;
  if (range.from) return `from ${range.from}`;
  if (range.to) return `up to ${range.to}`;
  return "all time";
}

function monthInRange(month: string, range: Range): boolean {
  if (range.from && month < range.from.slice(0, 7)) return false;
  if (range.to && month > range.to.slice(0, 7)) return false;
  return true;
}

// ---------------------------------------------------------------------------

async function studentsReport(range: Range): Promise<ReportDefinition> {
  const students = await prisma.student.findMany({ where: { deletedAt: null }, orderBy: { fullName: "asc" } });
  const byStatus = new Map<string, number>();
  for (const s of students) byStatus.set(s.status, (byStatus.get(s.status) ?? 0) + 1);
  return {
    title: "Student List Report",
    subtitle: rangeLabel({}),
    columns: [
      { header: "Full name", key: "name", width: 24 },
      { header: "Contact", key: "contact", width: 16 },
      { header: "Email", key: "email", width: 26 },
      { header: "Date of birth", key: "dob", width: 14 },
      { header: "Guardian", key: "guardian", width: 20 },
      { header: "Guardian phone", key: "guardianPhone", width: 16 },
      { header: "Address", key: "address", width: 30 },
      { header: "Enrolled", key: "enrolled", width: 14 },
      { header: "Status", key: "status", width: 12 },
      { header: "Notes", key: "notes", width: 30 },
    ],
    rows: students.map((s) => ({
      name: s.fullName,
      contact: s.contactNumber,
      email: s.email ?? "",
      dob: fmtDate(s.dateOfBirth),
      guardian: s.guardianName ?? "",
      guardianPhone: s.guardianPhone ?? "",
      address: s.address ?? "",
      enrolled: fmtDate(s.enrollmentDate),
      status: label(s.status),
      notes: s.notes ?? "",
    })),
    summary: [
      ["Total students", students.length],
      ...[...byStatus.entries()].map(([status, count]) => [label(status), count] as [string, number]),
    ],
  };
}

async function paymentsReport(range: Range): Promise<ReportDefinition> {
  const payments = await prisma.payment.findMany({
    where: { deletedAt: null, paymentDate: dateFilter(range) },
    include: { student: { select: { fullName: true } } },
    orderBy: { paymentDate: "asc" },
  });
  const byStatus = new Map<string, number>();
  for (const p of payments) byStatus.set(p.status, (byStatus.get(p.status) ?? 0) + p.amountCents);
  return {
    title: "Student Payment Report",
    subtitle: rangeLabel(range),
    columns: [
      { header: "Date", key: "date", width: 12 },
      { header: "Receipt #", key: "receipt", width: 18 },
      { header: "Student", key: "student", width: 24 },
      { header: "Type", key: "type", width: 18 },
      { header: "Method", key: "method", width: 14 },
      { header: "Status", key: "status", width: 12 },
      { header: "Period", key: "period", width: 10 },
      { header: "Amount", key: "amount", width: 14, format: "currency" },
      { header: "Notes", key: "notes", width: 30 },
    ],
    rows: payments.map((p) => ({
      date: fmtDate(p.paymentDate),
      receipt: p.receiptNumber,
      student: p.student.fullName,
      type: label(p.paymentType),
      method: label(p.method),
      status: label(p.status),
      period: p.periodMonth ?? "",
      amount: centsToDollars(p.amountCents),
      notes: p.notes ?? "",
    })),
    totals: { amount: centsToDollars(payments.reduce((sum, p) => sum + p.amountCents, 0)) },
    summary: [
      ["Payments listed", payments.length],
      ...[...byStatus.entries()].map(
        ([status, cents]) => [`${label(status)} total`, centsToDollars(cents)] as [string, number]
      ),
    ],
  };
}

async function outstandingReport(): Promise<ReportDefinition> {
  const payments = await prisma.payment.findMany({
    where: { deletedAt: null, status: { in: ["PENDING", "OVERDUE"] } },
    include: { student: { select: { fullName: true, contactNumber: true } } },
    orderBy: [{ studentId: "asc" }, { paymentDate: "asc" }],
  });
  const students = new Set(payments.map((p) => p.studentId));
  return {
    title: "Outstanding Payment Report",
    subtitle: "pending and overdue payments as of today",
    columns: [
      { header: "Student", key: "student", width: 24 },
      { header: "Contact", key: "contact", width: 16 },
      { header: "Receipt/Ref #", key: "receipt", width: 18 },
      { header: "Type", key: "type", width: 18 },
      { header: "Due date", key: "date", width: 12 },
      { header: "Status", key: "status", width: 12 },
      { header: "Amount", key: "amount", width: 14, format: "currency" },
      { header: "Notes", key: "notes", width: 30 },
    ],
    rows: payments.map((p) => ({
      student: p.student.fullName,
      contact: p.student.contactNumber,
      receipt: p.receiptNumber,
      type: label(p.paymentType),
      date: fmtDate(p.paymentDate),
      status: label(p.status),
      amount: centsToDollars(p.amountCents),
      notes: p.notes ?? "",
    })),
    totals: { amount: centsToDollars(payments.reduce((sum, p) => sum + p.amountCents, 0)) },
    summary: [
      ["Students with outstanding balance", students.size],
      ["Outstanding items", payments.length],
    ],
  };
}

async function teachersReport(): Promise<ReportDefinition> {
  const teachers = await prisma.teacher.findMany({ where: { deletedAt: null }, orderBy: { fullName: "asc" } });
  return {
    title: "Teacher List Report",
    subtitle: "includes bank details — handle confidentially",
    columns: [
      { header: "Full name", key: "name", width: 24 },
      { header: "Contact", key: "contact", width: 16 },
      { header: "Email", key: "email", width: 26 },
      { header: "Employment", key: "employment", width: 16 },
      { header: "Hourly rate", key: "hourlyRate", width: 14, format: "currency" },
      { header: "Monthly salary", key: "monthlySalary", width: 14, format: "currency" },
      { header: "Bank", key: "bank", width: 18 },
      { header: "Account name", key: "accountName", width: 20 },
      { header: "Account number", key: "accountNumber", width: 20 },
      { header: "Start date", key: "startDate", width: 12 },
      { header: "Status", key: "status", width: 10 },
    ],
    rows: teachers.map((t) => ({
      name: t.fullName,
      contact: t.contactNumber,
      email: t.email ?? "",
      employment: label(t.employmentType),
      hourlyRate: t.hourlyRateCents != null ? centsToDollars(t.hourlyRateCents) : "",
      monthlySalary: t.monthlySalaryCents != null ? centsToDollars(t.monthlySalaryCents) : "",
      bank: t.bankName ?? "",
      accountName: t.bankAccountName ?? "",
      accountNumber: t.bankAccountNumber ?? "",
      startDate: fmtDate(t.startDate),
      status: label(t.status),
    })),
    summary: [
      ["Total teachers", teachers.length],
      ["Active", teachers.filter((t) => t.status === "ACTIVE").length],
    ],
  };
}

async function workHoursReport(range: Range): Promise<ReportDefinition> {
  const logs = await prisma.workLog.findMany({
    where: { deletedAt: null, workDate: dateFilter(range) },
    include: { teacher: { select: { fullName: true } }, class: { select: { name: true } } },
    orderBy: [{ workDate: "asc" }, { startTime: "asc" }],
  });
  const approvedByTeacher = new Map<string, number>();
  for (const log of logs) {
    if (log.approvalStatus !== "APPROVED") continue;
    approvedByTeacher.set(log.teacher.fullName, (approvedByTeacher.get(log.teacher.fullName) ?? 0) + log.payableMinutes);
  }
  return {
    title: "Teacher Working Hours Report",
    subtitle: rangeLabel(range),
    columns: [
      { header: "Date", key: "date", width: 12 },
      { header: "Teacher", key: "teacher", width: 22 },
      { header: "Class", key: "class", width: 22 },
      { header: "Start", key: "start", width: 8 },
      { header: "End", key: "end", width: 8 },
      { header: "Break (min)", key: "break", width: 11 },
      { header: "Payable hours", key: "hours", width: 13, format: "hours" },
      { header: "Adjusted", key: "adjusted", width: 10 },
      { header: "Status", key: "status", width: 11 },
      { header: "Remarks", key: "remarks", width: 28 },
    ],
    rows: logs.map((log) => ({
      date: fmtDate(log.workDate),
      teacher: log.teacher.fullName,
      class: log.class?.name ?? "",
      start: log.startTime,
      end: log.endTime,
      break: log.breakMinutes,
      hours: log.payableMinutes / 60,
      adjusted: log.adjustedMinutes != null ? `Yes — ${log.adjustmentReason ?? ""}` : "",
      status: label(log.approvalStatus),
      remarks: log.remarks ?? "",
    })),
    totals: { hours: logs.reduce((sum, l) => sum + l.payableMinutes, 0) / 60 },
    summary: [
      ["Approved hours (payable)", Number(minutesToHoursLabel(logs.filter((l) => l.approvalStatus === "APPROVED").reduce((s, l) => s + l.payableMinutes, 0)))],
      ...[...approvedByTeacher.entries()].map(
        ([name, minutes]) => [`${name} — approved hours`, Number(minutesToHoursLabel(minutes))] as [string, number]
      ),
    ],
  };
}

async function payrollReport(range: Range): Promise<ReportDefinition> {
  const records = await prisma.payrollRecord.findMany({
    include: { teacher: { select: { fullName: true } } },
    orderBy: [{ month: "asc" }, { createdAt: "asc" }],
  });
  const filtered = records.filter((r) => monthInRange(r.month, range));
  const sum = (fn: (r: (typeof filtered)[number]) => number) => filtered.reduce((s, r) => s + fn(r), 0);
  return {
    title: "Teacher Payroll Report",
    subtitle: rangeLabel(range),
    columns: [
      { header: "Month", key: "month", width: 10 },
      { header: "Teacher", key: "teacher", width: 22 },
      { header: "Employment", key: "employment", width: 14 },
      { header: "Hours", key: "hours", width: 10, format: "hours" },
      { header: "Base pay", key: "base", width: 13, format: "currency" },
      { header: "Allowance", key: "allowance", width: 12, format: "currency" },
      { header: "Bonus", key: "bonus", width: 12, format: "currency" },
      { header: "Deduction", key: "deduction", width: 12, format: "currency" },
      { header: "Gross pay", key: "gross", width: 13, format: "currency" },
      { header: "Net pay", key: "net", width: 13, format: "currency" },
      { header: "Status", key: "status", width: 10 },
      { header: "Paid date", key: "paidDate", width: 12 },
      { header: "Method", key: "method", width: 14 },
    ],
    rows: filtered.map((r) => ({
      month: r.month,
      teacher: r.teacher.fullName,
      employment: label(r.employmentType),
      hours: r.totalMinutes / 60,
      base: centsToDollars(r.basePayCents),
      allowance: centsToDollars(r.allowanceCents),
      bonus: centsToDollars(r.bonusCents),
      deduction: centsToDollars(r.deductionCents),
      gross: centsToDollars(r.grossPayCents),
      net: centsToDollars(r.netPayCents),
      status: label(r.status),
      paidDate: fmtDate(r.paymentDate),
      method: label(r.paymentMethod),
    })),
    totals: {
      base: centsToDollars(sum((r) => r.basePayCents)),
      allowance: centsToDollars(sum((r) => r.allowanceCents)),
      bonus: centsToDollars(sum((r) => r.bonusCents)),
      deduction: centsToDollars(sum((r) => r.deductionCents)),
      gross: centsToDollars(sum((r) => r.grossPayCents)),
      net: centsToDollars(sum((r) => r.netPayCents)),
      hours: sum((r) => r.totalMinutes) / 60,
    },
    summary: [
      ["Records", filtered.length],
      ["Draft", filtered.filter((r) => r.status === "DRAFT").length],
      ["Approved", filtered.filter((r) => r.status === "APPROVED").length],
      ["Paid", filtered.filter((r) => r.status === "PAID").length],
    ],
  };
}

async function monthlyIncomeReport(range: Range): Promise<ReportDefinition> {
  const payments = await prisma.payment.findMany({
    where: { deletedAt: null, status: "PAID", paymentDate: dateFilter(range) },
  });
  const byMonthType = new Map<string, { month: string; type: string; count: number; cents: number }>();
  const byMethod = new Map<string, number>();
  for (const p of payments) {
    const month = monthOf(p.paymentDate);
    const key = `${month}|${p.paymentType}`;
    const entry = byMonthType.get(key) ?? { month, type: p.paymentType, count: 0, cents: 0 };
    entry.count += 1;
    entry.cents += p.amountCents;
    byMonthType.set(key, entry);
    byMethod.set(p.method, (byMethod.get(p.method) ?? 0) + p.amountCents);
  }
  const rows = [...byMonthType.values()].sort((a, b) => a.month.localeCompare(b.month) || a.type.localeCompare(b.type));
  return {
    title: "Monthly Income Report",
    subtitle: `${rangeLabel(range)} — paid payments only`,
    columns: [
      { header: "Month", key: "month", width: 10 },
      { header: "Payment type", key: "type", width: 20 },
      { header: "Payments", key: "count", width: 10 },
      { header: "Amount", key: "amount", width: 15, format: "currency" },
    ],
    rows: rows.map((r) => ({ month: r.month, type: label(r.type), count: r.count, amount: centsToDollars(r.cents) })),
    totals: {
      count: payments.length,
      amount: centsToDollars(payments.reduce((sum, p) => sum + p.amountCents, 0)),
    },
    summary: [...byMethod.entries()].map(
      ([method, cents]) => [`Received via ${label(method)}`, centsToDollars(cents)] as [string, number]
    ),
  };
}

async function monthlyExpenseReport(range: Range): Promise<ReportDefinition> {
  const records = await prisma.payrollRecord.findMany({
    where: { status: { in: ["APPROVED", "PAID"] } },
    include: { teacher: { select: { fullName: true } } },
  });
  const filtered = records.filter((r) => monthInRange(r.month, range));
  const byMonth = new Map<string, { month: string; teachers: number; minutes: number; gross: number; net: number }>();
  for (const r of filtered) {
    const entry = byMonth.get(r.month) ?? { month: r.month, teachers: 0, minutes: 0, gross: 0, net: 0 };
    entry.teachers += 1;
    entry.minutes += r.totalMinutes;
    entry.gross += r.grossPayCents;
    entry.net += r.netPayCents;
    byMonth.set(r.month, entry);
  }
  const rows = [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
  return {
    title: "Monthly Expense (Payroll) Report",
    subtitle: `${rangeLabel(range)} — approved and paid payroll only`,
    columns: [
      { header: "Month", key: "month", width: 10 },
      { header: "Teachers", key: "teachers", width: 10 },
      { header: "Hours", key: "hours", width: 10, format: "hours" },
      { header: "Gross payroll", key: "gross", width: 15, format: "currency" },
      { header: "Net payroll", key: "net", width: 15, format: "currency" },
    ],
    rows: rows.map((r) => ({
      month: r.month,
      teachers: r.teachers,
      hours: r.minutes / 60,
      gross: centsToDollars(r.gross),
      net: centsToDollars(r.net),
    })),
    totals: {
      gross: centsToDollars(filtered.reduce((s, r) => s + r.grossPayCents, 0)),
      net: centsToDollars(filtered.reduce((s, r) => s + r.netPayCents, 0)),
      hours: filtered.reduce((s, r) => s + r.totalMinutes, 0) / 60,
    },
    summary: [["Payroll records included", filtered.length]],
  };
}

async function taxSummaryReport(range: Range): Promise<ReportDefinition> {
  const [payments, payrolls] = await Promise.all([
    prisma.payment.findMany({ where: { deletedAt: null, status: "PAID", paymentDate: dateFilter(range) } }),
    prisma.payrollRecord.findMany({ where: { status: { in: ["APPROVED", "PAID"] } } }),
  ]);
  const filteredPayrolls = payrolls.filter((r) => monthInRange(r.month, range));
  const months = new Map<string, { income: number; gross: number; net: number }>();
  for (const p of payments) {
    const m = monthOf(p.paymentDate);
    const entry = months.get(m) ?? { income: 0, gross: 0, net: 0 };
    entry.income += p.amountCents;
    months.set(m, entry);
  }
  for (const r of filteredPayrolls) {
    const entry = months.get(r.month) ?? { income: 0, gross: 0, net: 0 };
    entry.gross += r.grossPayCents;
    entry.net += r.netPayCents;
    months.set(r.month, entry);
  }
  const rows = [...months.entries()].sort(([a], [b]) => a.localeCompare(b));
  const totalIncome = payments.reduce((s, p) => s + p.amountCents, 0);
  const totalGross = filteredPayrolls.reduce((s, r) => s + r.grossPayCents, 0);
  return {
    title: "Tax / Accounting Summary Report",
    subtitle: `${rangeLabel(range)} — for accounting reference; confirm treatment with your accountant`,
    columns: [
      { header: "Month", key: "month", width: 10 },
      { header: "Income (paid)", key: "income", width: 16, format: "currency" },
      { header: "Payroll gross", key: "gross", width: 16, format: "currency" },
      { header: "Payroll net", key: "net", width: 16, format: "currency" },
      { header: "Surplus (income − gross payroll)", key: "surplus", width: 26, format: "currency" },
    ],
    rows: rows.map(([month, v]) => ({
      month,
      income: centsToDollars(v.income),
      gross: centsToDollars(v.gross),
      net: centsToDollars(v.net),
      surplus: centsToDollars(v.income - v.gross),
    })),
    totals: {
      income: centsToDollars(totalIncome),
      gross: centsToDollars(totalGross),
      net: centsToDollars(filteredPayrolls.reduce((s, r) => s + r.netPayCents, 0)),
      surplus: centsToDollars(totalIncome - totalGross),
    },
    summary: [
      ["Total income (paid payments)", centsToDollars(totalIncome)],
      ["Total payroll expense (gross)", centsToDollars(totalGross)],
      ["Surplus before other expenses", centsToDollars(totalIncome - totalGross)],
    ],
  };
}

// ---------------------------------------------------------------------------

export async function buildReport(user: SessionUser, type: ReportType, range: Range): Promise<ReportDefinition> {
  let def: ReportDefinition;
  switch (type) {
    case "students": def = await studentsReport(range); break;
    case "payments": def = await paymentsReport(range); break;
    case "outstanding": def = await outstandingReport(); break;
    case "teachers": def = await teachersReport(); break;
    case "work-hours": def = await workHoursReport(range); break;
    case "payroll": def = await payrollReport(range); break;
    case "monthly-income": def = await monthlyIncomeReport(range); break;
    case "monthly-expense": def = await monthlyExpenseReport(range); break;
    case "tax-summary": def = await taxSummaryReport(range); break;
  }
  await prisma.exportLog.create({
    data: { userId: user.id, reportType: type, params: JSON.stringify(range) },
  });
  await logAudit(user, {
    action: "EXPORT",
    entityType: "Report",
    entityId: type,
    summary: `Exported ${def.title} (${rangeLabel(range)})`,
  });
  return def;
}
