import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { formatCents } from "@/lib/money";
import { fmtDate, minutesToHoursLabel } from "@/lib/dates";
import { DAYS_OF_WEEK, label } from "@/lib/constants";
import { Badge, PageHeader, StatCard } from "@/components/ui";
import { getDashboardData } from "@/server/services/dashboard";
import { listWorkLogs } from "@/server/services/worklogs";
import { listPayrolls } from "@/server/services/payroll";
import { listClasses } from "@/server/services/classes";

export default async function DashboardPage() {
  const user = await requireUser();
  if (user.role === "TEACHER") return <TeacherDashboard />;
  const data = await getDashboardData();

  const alerts: { text: string; href: string }[] = [];
  if (data.overdueCount > 0) alerts.push({ text: `${data.overdueCount} overdue payment(s) need follow-up`, href: "/payments?status=OVERDUE" });
  if (data.pendingApprovals > 0) alerts.push({ text: `${data.pendingApprovals} work-hour record(s) awaiting approval`, href: "/work-logs?approvalStatus=PENDING" });
  if (data.draftPayrolls > 0) alerts.push({ text: `${data.draftPayrolls} draft payroll record(s) for ${data.month}`, href: "/payroll" });

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`Overview for ${data.month}`} />

      {alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {alerts.map((a, i) => (
            <Link key={i} href={a.href} className="block rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 hover:bg-amber-100">
              ⚠ {a.text}
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard title="Active students" value={data.activeStudents} />
        <StatCard title="Income this month" value={formatCents(data.monthIncomeCents)} hint="Paid payments" />
        <StatCard
          title="Outstanding"
          value={formatCents(data.outstandingCents)}
          hint={`${data.outstandingCount} pending/overdue item(s)`}
          tone={data.outstandingCents > 0 ? "warn" : undefined}
        />
        <StatCard
          title="Pending approvals"
          value={data.pendingApprovals}
          hint="Work-hour records"
          tone={data.pendingApprovals > 0 ? "warn" : undefined}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Payroll — {data.month}</h2>
          {data.payrollSummary.length === 0 ? (
            <p className="text-sm text-gray-500">
              No payroll generated yet. <Link href="/payroll" className="text-indigo-600 hover:underline">Generate now →</Link>
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.payrollSummary.map((p) => (
                <li key={p.status} className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><Badge value={p.status} /> {p.count} record(s)</span>
                  <span className="font-medium">{formatCents(p.netCents)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Upcoming classes</h2>
          <ul className="space-y-2 text-sm">
            {data.upcomingClasses.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2">
                <div>
                  <Link href={`/classes/${c.id}`} className="font-medium text-gray-900 hover:text-indigo-600">{c.name}</Link>
                  <span className="ml-2 text-xs text-gray-500">
                    {DAYS_OF_WEEK[c.dayOfWeek ?? 0]} {c.startTime}–{c.endTime} · {c.teacher.fullName}
                  </span>
                </div>
                <span className="text-xs text-gray-500">{c._count.enrollments}/{c.capacity}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card mt-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Recent payments</h2>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr><th>Date</th><th>Receipt</th><th>Student</th><th>Type</th><th>Method</th><th>Status</th><th className="text-right">Amount</th></tr>
            </thead>
            <tbody>
              {data.recentPayments.map((p) => (
                <tr key={p.id}>
                  <td>{fmtDate(p.paymentDate)}</td>
                  <td className="font-mono text-xs">{p.receiptNumber}</td>
                  <td>{p.student.fullName}</td>
                  <td>{label(p.paymentType)}</td>
                  <td>{label(p.method)}</td>
                  <td><Badge value={p.status} /></td>
                  <td className="text-right font-medium">{formatCents(p.amountCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

async function TeacherDashboard() {
  const user = await requireUser();
  const [classes, workLogs, payrolls] = await Promise.all([
    listClasses(user, {}),
    listWorkLogs(user, { pageSize: 8 }),
    listPayrolls(user, {}),
  ]);
  return (
    <>
      <PageHeader title={`Welcome, ${user.name}`} subtitle="Your classes, hours, and payroll" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard title="My classes" value={classes.length} />
        <StatCard title="Approved hours (listed)" value={minutesToHoursLabel(workLogs.approvedMinutes)} />
        <StatCard title="Payroll records" value={payrolls.records.length} />
      </div>
      <div className="card mt-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Recent work logs</h2>
        <div className="overflow-x-auto">
          <table className="table">
            <thead><tr><th>Date</th><th>Time</th><th>Hours</th><th>Status</th></tr></thead>
            <tbody>
              {workLogs.logs.map((l) => (
                <tr key={l.id}>
                  <td>{fmtDate(l.workDate)}</td>
                  <td>{l.startTime}–{l.endTime}</td>
                  <td>{minutesToHoursLabel(l.payableMinutes)}</td>
                  <td><Badge value={l.approvalStatus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Link href="/work-logs" className="mt-3 inline-block text-sm text-indigo-600 hover:underline">All work hours →</Link>
      </div>
    </>
  );
}
