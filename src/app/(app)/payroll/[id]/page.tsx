import Link from "next/link";
import { can, requireUser } from "@/lib/auth";
import { fmtDate, minutesToHoursLabel } from "@/lib/dates";
import { label } from "@/lib/constants";
import { formatCents } from "@/lib/money";
import { Badge, DetailRow, PageHeader } from "@/components/ui";
import { ActionButton } from "@/components/actions";
import { AdjustmentForm, MarkPaidForm } from "@/components/PayrollControls";
import { getPayroll } from "@/server/services/payroll";

export default async function PayrollDetailPage(props: { params: Promise<{ id: string }> }) {
  const user = await requireUser("payroll.read");
  const { id } = await props.params;
  const record = await getPayroll(user, id);
  const writable = can(user, "payroll.write");

  return (
    <>
      <PageHeader
        title={`Payroll — ${record.teacher.fullName}`}
        subtitle={`${record.month} · ${label(record.employmentType)}`}
        action={
          writable && (
            <>
              {record.status === "DRAFT" && (
                <ActionButton
                  label="Approve"
                  url={`/api/payroll/${record.id}`}
                  method="PATCH"
                  body={{ status: "APPROVED" }}
                  variant="primary"
                  confirmText={`Approve payroll ${record.month} for ${record.teacher.fullName} (net ${formatCents(record.netPayCents)})? Work hours for the month will be locked.`}
                />
              )}
              {record.status === "APPROVED" && (
                <ActionButton
                  label="Revert to draft"
                  url={`/api/payroll/${record.id}`}
                  method="PATCH"
                  body={{ status: "DRAFT" }}
                />
              )}
            </>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-2 text-sm font-semibold text-gray-900">Calculation</h2>
          <dl>
            <DetailRow term="Status"><Badge value={record.status} /></DetailRow>
            {record.employmentType !== "MONTHLY" && (
              <>
                <DetailRow term="Approved hours">{minutesToHoursLabel(record.totalMinutes)}</DetailRow>
                <DetailRow term="Hourly rate">{formatCents(record.hourlyRateCents)}/hr</DetailRow>
              </>
            )}
            <DetailRow term="Base pay">{formatCents(record.basePayCents)}</DetailRow>
            <DetailRow term="Allowances">{formatCents(record.allowanceCents)}</DetailRow>
            <DetailRow term="Bonuses">{formatCents(record.bonusCents)}</DetailRow>
            <DetailRow term="Deductions">-{formatCents(record.deductionCents)}</DetailRow>
            <DetailRow term="Gross pay">{formatCents(record.grossPayCents)}</DetailRow>
            <DetailRow term="Net pay"><span className="text-base font-bold">{formatCents(record.netPayCents)}</span></DetailRow>
            {record.status === "PAID" && (
              <>
                <DetailRow term="Paid on">{fmtDate(record.paymentDate)}</DetailRow>
                <DetailRow term="Method">{label(record.paymentMethod)}</DetailRow>
              </>
            )}
          </dl>
          {record.notes && <p className="mt-3 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">{record.notes}</p>}
          <p className="mt-3 text-xs text-gray-400">
            Teacher profile: <Link href={`/teachers/${record.teacherId}`} className="text-indigo-600 hover:underline">{record.teacher.fullName}</Link> ·
            Hours: <Link href={`/work-logs?month=${record.month}&teacherId=${record.teacherId}`} className="text-indigo-600 hover:underline">view {record.month} logs</Link>
          </p>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Adjustments</h2>
            {record.adjustments.length === 0 ? (
              <p className="mb-3 text-sm text-gray-500">No adjustments.</p>
            ) : (
              <table className="table mb-3">
                <thead><tr><th>Type</th><th>Reason</th><th className="text-right">Amount</th>{writable && record.status === "DRAFT" && <th></th>}</tr></thead>
                <tbody>
                  {record.adjustments.map((a) => (
                    <tr key={a.id}>
                      <td><Badge value={a.type} /></td>
                      <td>{a.reason}</td>
                      <td className="text-right font-medium">
                        {a.type === "DEDUCTION" ? "-" : "+"}{formatCents(a.amountCents)}
                      </td>
                      {writable && record.status === "DRAFT" && (
                        <td className="text-right">
                          <ActionButton
                            label="Remove"
                            url={`/api/payroll/${record.id}/adjustments/${a.id}`}
                            method="DELETE"
                            variant="danger"
                            confirmText="Remove this adjustment?"
                          />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {writable && record.status === "DRAFT" && <AdjustmentForm payrollId={record.id} />}
            {record.status !== "DRAFT" && (
              <p className="text-xs text-gray-400">Adjustments can only be changed while the record is a draft.</p>
            )}
          </div>

          {writable && record.status === "APPROVED" && (
            <div className="card">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">Record payment</h2>
              <MarkPaidForm payrollId={record.id} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
