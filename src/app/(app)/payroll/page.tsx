import Link from "next/link";
import { can, requireUser } from "@/lib/auth";
import { PAYROLL_STATUSES, label } from "@/lib/constants";
import { currentMonth, minutesToHoursLabel } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { Badge, EmptyState, FilterSelect, PageHeader } from "@/components/ui";
import { PayrollGenerateForm } from "@/components/PayrollControls";
import { listPayrolls } from "@/server/services/payroll";
import { teacherOptions } from "@/server/services/teachers";

export default async function PayrollPage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser("payroll.read");
  const sp = await props.searchParams;
  const writable = can(user, "payroll.write");
  const [{ records, totalGrossCents, totalNetCents }, teachers] = await Promise.all([
    listPayrolls(user, { month: sp.month, status: sp.status, teacherId: sp.teacherId }),
    writable ? teacherOptions() : Promise.resolve([]),
  ]);

  return (
    <>
      <PageHeader
        title="Payroll"
        subtitle={`${records.length} record(s) · gross ${formatCents(totalGrossCents)} · net ${formatCents(totalNetCents)}`}
      />

      {writable && (
        <div className="card mb-6">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Generate payroll</h2>
          <PayrollGenerateForm teachers={teachers} defaultMonth={currentMonth()} />
        </div>
      )}

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-40">
          <label className="label">Month</label>
          <input type="month" name="month" defaultValue={sp.month ?? ""} className="input" />
        </div>
        <FilterSelect name="status" title="Status" defaultValue={sp.status} values={PAYROLL_STATUSES} width="w-36" />
        <button className="btn">Apply</button>
        <Link href="/payroll" className="btn">Clear</Link>
      </form>

      {records.length === 0 ? (
        <EmptyState message="No payroll records for these filters." />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Month</th><th>Teacher</th><th>Employment</th><th className="text-right">Hours</th>
                <th className="text-right">Base</th><th className="text-right">Adjustments</th>
                <th className="text-right">Net pay</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td><Link href={`/payroll/${r.id}`} className="font-medium text-gray-900 hover:text-indigo-600">{r.month}</Link></td>
                  <td>{r.teacher.fullName}</td>
                  <td>{label(r.employmentType)}</td>
                  <td className="text-right">{r.employmentType === "MONTHLY" ? "—" : minutesToHoursLabel(r.totalMinutes)}</td>
                  <td className="text-right">{formatCents(r.basePayCents)}</td>
                  <td className="text-right">
                    {r.allowanceCents + r.bonusCents - r.deductionCents === 0
                      ? "—"
                      : formatCents(r.allowanceCents + r.bonusCents - r.deductionCents)}
                  </td>
                  <td className="text-right font-semibold">{formatCents(r.netPayCents)}</td>
                  <td><Badge value={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
