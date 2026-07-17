import Link from "next/link";
import { can, requireUser } from "@/lib/auth";
import { APPROVAL_STATUSES, label } from "@/lib/constants";
import { currentMonth, fmtDate, minutesToHoursLabel } from "@/lib/dates";
import { Badge, EmptyState, PageHeader, Pagination, StatCard } from "@/components/ui";
import { ActionButton } from "@/components/actions";
import { listWorkLogs, monthlySummary } from "@/server/services/worklogs";
import { teacherOptions } from "@/server/services/teachers";

export default async function WorkLogsPage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser("worklogs.read");
  const sp = await props.searchParams;
  const month = sp.month ?? currentMonth();
  const approver = can(user, "worklogs.approve");
  const isTeacher = user.role === "TEACHER";

  const [{ logs, total, page, pages, approvedMinutes }, teachers, summary] = await Promise.all([
    listWorkLogs(user, {
      teacherId: sp.teacherId,
      approvalStatus: sp.approvalStatus,
      month,
      page: sp.page ? Number(sp.page) : 1,
    }),
    isTeacher ? Promise.resolve([]) : teacherOptions(),
    approver ? monthlySummary(month) : Promise.resolve([]),
  ]);
  const qs = (overrides: Record<string, string>) =>
    "?" + new URLSearchParams({ ...(sp as Record<string, string>), month, ...overrides }).toString();

  return (
    <>
      <PageHeader
        title="Work Hours"
        subtitle={`${total} record(s) in ${month} · ${minutesToHoursLabel(approvedMinutes)} approved hours`}
        action={<Link href="/work-logs/new" className="btn btn-primary">+ Log hours</Link>}
      />

      {approver && summary.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {summary.slice(0, 4).map((s) => (
            <StatCard
              key={s.teacher.id}
              title={s.teacher.fullName}
              value={`${minutesToHoursLabel(s.minutes.APPROVED ?? 0)}h`}
              hint={`${minutesToHoursLabel(s.minutes.PENDING ?? 0)}h pending · ${s.count} record(s)`}
            />
          ))}
        </div>
      )}

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-40">
          <label className="label">Month</label>
          <input type="month" name="month" defaultValue={month} className="input" />
        </div>
        {!isTeacher && (
          <div className="w-48">
            <label className="label">Teacher</label>
            <select name="teacherId" defaultValue={sp.teacherId ?? ""} className="input">
              <option value="">All</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
            </select>
          </div>
        )}
        <div className="w-40">
          <label className="label">Approval</label>
          <select name="approvalStatus" defaultValue={sp.approvalStatus ?? ""} className="input">
            <option value="">All</option>
            {APPROVAL_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
          </select>
        </div>
        <button className="btn">Apply</button>
        <Link href="/work-logs" className="btn">Clear</Link>
      </form>

      {logs.length === 0 ? (
        <EmptyState message="No work-hour records for these filters." />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th><th>Teacher</th><th>Class</th><th>Time</th><th>Break</th>
                <th className="text-right">Hours</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>{fmtDate(l.workDate)}</td>
                  <td className="font-medium">{l.teacher.fullName}</td>
                  <td>{l.class?.name ?? "—"}</td>
                  <td>{l.startTime}–{l.endTime}</td>
                  <td>{l.breakMinutes > 0 ? `${l.breakMinutes}m` : "—"}</td>
                  <td className="text-right font-medium">
                    {minutesToHoursLabel(l.payableMinutes)}
                    {l.adjustedMinutes != null && (
                      <span title={l.adjustmentReason ?? "Manually adjusted"} className="ml-1 cursor-help text-amber-600">*</span>
                    )}
                  </td>
                  <td><Badge value={l.approvalStatus} /></td>
                  <td className="space-x-1 text-right">
                    {approver && l.approvalStatus === "PENDING" && (
                      <>
                        <ActionButton label="Approve" url={`/api/work-logs/${l.id}/decision`} body={{ decision: "APPROVED" }} variant="primary" />
                        <ActionButton label="Reject" url={`/api/work-logs/${l.id}/decision`} body={{ decision: "REJECTED" }} variant="danger" />
                      </>
                    )}
                    {(approver || (isTeacher && l.approvalStatus === "PENDING")) && (
                      <Link href={`/work-logs/${l.id}/edit`} className="btn btn-sm">Edit</Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pages={pages} makeHref={(p) => qs({ page: String(p) })} />
      <p className="mt-3 text-xs text-gray-400">* manually adjusted — hover for the reason. Records lock once the month&apos;s payroll is approved.</p>
    </>
  );
}
