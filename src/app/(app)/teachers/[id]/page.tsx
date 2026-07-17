import Link from "next/link";
import { can, requireUser } from "@/lib/auth";
import { formatCents } from "@/lib/money";
import { fmtDate, minutesToHoursLabel } from "@/lib/dates";
import { DAYS_OF_WEEK, label } from "@/lib/constants";
import { Badge, DetailRow, PageHeader } from "@/components/ui";
import { ActionButton } from "@/components/actions";
import { getTeacher } from "@/server/services/teachers";

export default async function TeacherDetailPage(props: { params: Promise<{ id: string }> }) {
  const user = await requireUser("teachers.read");
  const { id } = await props.params;
  const teacher = await getTeacher(id);
  const writable = can(user, "teachers.write");

  return (
    <>
      <PageHeader
        title={teacher.fullName}
        subtitle={`${label(teacher.employmentType)} · started ${fmtDate(teacher.startDate)}`}
        action={
          <>
            {writable && <Link href={`/teachers/${teacher.id}/edit`} className="btn btn-primary">Edit</Link>}
            {writable && (
              <ActionButton
                label="Delete"
                url={`/api/teachers/${teacher.id}`}
                method="DELETE"
                variant="danger"
                confirmText={`Archive ${teacher.fullName}? Payroll and work-hour history is kept.`}
                redirectTo="/teachers"
              />
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <h2 className="mb-2 text-sm font-semibold text-gray-900">Profile</h2>
          <dl>
            <DetailRow term="Status"><Badge value={teacher.status} /></DetailRow>
            <DetailRow term="Contact">{teacher.contactNumber}</DetailRow>
            <DetailRow term="Email">{teacher.email ?? "—"}</DetailRow>
            <DetailRow term="Employment">{label(teacher.employmentType)}</DetailRow>
            {teacher.employmentType === "MONTHLY" ? (
              <DetailRow term="Monthly salary">{formatCents(teacher.monthlySalaryCents)}</DetailRow>
            ) : (
              <DetailRow term="Hourly rate">{formatCents(teacher.hourlyRateCents)}/hr</DetailRow>
            )}
            <DetailRow term="Bank">{teacher.bankName ?? "—"}</DetailRow>
            <DetailRow term="Account name">{teacher.bankAccountName ?? "—"}</DetailRow>
            <DetailRow term="Account number">{teacher.bankAccountNumber ?? "—"}</DetailRow>
          </dl>
          {teacher.notes && <p className="mt-3 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">{teacher.notes}</p>}
        </div>

        <div className="space-y-6 lg:col-span-2">
          <div className="card">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Classes</h2>
            {teacher.classes.length === 0 ? (
              <p className="text-sm text-gray-500">No classes assigned.</p>
            ) : (
              <table className="table">
                <thead><tr><th>Class</th><th>Schedule</th><th>Status</th></tr></thead>
                <tbody>
                  {teacher.classes.map((c) => (
                    <tr key={c.id}>
                      <td><Link href={`/classes/${c.id}`} className="font-medium hover:text-indigo-600">{c.name}</Link></td>
                      <td>{c.dayOfWeek != null ? `${DAYS_OF_WEEK[c.dayOfWeek]} ${c.startTime}–${c.endTime}` : c.scheduleNotes ?? "—"}</td>
                      <td><Badge value={c.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Recent work logs</h2>
            {teacher.workLogs.length === 0 ? (
              <p className="text-sm text-gray-500">No work logs.</p>
            ) : (
              <table className="table">
                <thead><tr><th>Date</th><th>Time</th><th>Class</th><th className="text-right">Hours</th><th>Status</th></tr></thead>
                <tbody>
                  {teacher.workLogs.map((l) => (
                    <tr key={l.id}>
                      <td>{fmtDate(l.workDate)}</td>
                      <td>{l.startTime}–{l.endTime}</td>
                      <td>{l.class?.name ?? "—"}</td>
                      <td className="text-right">{minutesToHoursLabel(l.payableMinutes)}</td>
                      <td><Badge value={l.approvalStatus} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {can(user, "payroll.read") && (
            <div className="card">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">Payroll history</h2>
              {teacher.payrolls.length === 0 ? (
                <p className="text-sm text-gray-500">No payroll records.</p>
              ) : (
                <table className="table">
                  <thead><tr><th>Month</th><th className="text-right">Hours</th><th className="text-right">Gross</th><th className="text-right">Net</th><th>Status</th></tr></thead>
                  <tbody>
                    {teacher.payrolls.map((p) => (
                      <tr key={p.id}>
                        <td><Link href={`/payroll/${p.id}`} className="font-medium hover:text-indigo-600">{p.month}</Link></td>
                        <td className="text-right">{minutesToHoursLabel(p.totalMinutes)}</td>
                        <td className="text-right">{formatCents(p.grossPayCents)}</td>
                        <td className="text-right font-medium">{formatCents(p.netPayCents)}</td>
                        <td><Badge value={p.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
