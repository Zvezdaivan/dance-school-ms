import Link from "next/link";
import { can, requireUser } from "@/lib/auth";
import { PAYMENT_METHODS, PAYMENT_STATUSES, PAYMENT_TYPES, label } from "@/lib/constants";
import { fmtDate } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { Badge, EmptyState, FilterSelect, makeQs, PageHeader, Pagination, StatCard } from "@/components/ui";
import { ActionButton } from "@/components/actions";
import { listPayments } from "@/server/services/payments";

export default async function PaymentsPage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser("payments.read");
  const sp = await props.searchParams;
  const { payments, total, page, pages, totals } = await listPayments({
    status: sp.status,
    method: sp.method,
    paymentType: sp.paymentType,
    from: sp.from,
    to: sp.to,
    page: sp.page ? Number(sp.page) : 1,
  });
  const writable = can(user, "payments.write");
  const qs = makeQs(sp);

  return (
    <>
      <PageHeader
        title="Payments"
        subtitle={`${total} payment(s) matching filters`}
        action={writable && <Link href="/payments/new" className="btn btn-primary">+ Record payment</Link>}
      />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard title="Paid (filtered)" value={formatCents(totals.PAID ?? 0)} />
        <StatCard title="Pending" value={formatCents(totals.PENDING ?? 0)} tone={totals.PENDING ? "warn" : undefined} />
        <StatCard title="Overdue" value={formatCents(totals.OVERDUE ?? 0)} tone={totals.OVERDUE ? "danger" : undefined} />
        <StatCard title="Refunded" value={formatCents(totals.REFUNDED ?? 0)} />
      </div>

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-36">
          <label className="label">From</label>
          <input type="date" name="from" defaultValue={sp.from ?? ""} className="input" />
        </div>
        <div className="w-36">
          <label className="label">To</label>
          <input type="date" name="to" defaultValue={sp.to ?? ""} className="input" />
        </div>
        <FilterSelect name="status" title="Status" defaultValue={sp.status} values={PAYMENT_STATUSES} width="w-36" />
        <FilterSelect name="method" title="Method" defaultValue={sp.method} values={PAYMENT_METHODS} />
        <FilterSelect name="paymentType" title="Type" defaultValue={sp.paymentType} values={PAYMENT_TYPES} width="w-44" />
        <button className="btn">Apply</button>
        <Link href="/payments" className="btn">Clear</Link>
      </form>

      {payments.length === 0 ? (
        <EmptyState message="No payments match your filters." />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th><th>Receipt</th><th>Student</th><th>Type</th><th>Method</th><th>Status</th>
                <th className="text-right">Amount</th>{writable && <th></th>}
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>{fmtDate(p.paymentDate)}</td>
                  <td className="font-mono text-xs">{p.receiptNumber}</td>
                  <td><Link href={`/students/${p.studentId}`} className="font-medium hover:text-indigo-600">{p.student.fullName}</Link></td>
                  <td>{label(p.paymentType)}</td>
                  <td>{label(p.method)}</td>
                  <td><Badge value={p.status} /></td>
                  <td className="text-right font-medium">{formatCents(p.amountCents)}</td>
                  {writable && (
                    <td className="space-x-1 text-right">
                      {(p.status === "PENDING" || p.status === "OVERDUE") && (
                        <ActionButton label="Mark paid" url={`/api/payments/${p.id}`} method="PATCH" body={{ status: "PAID" }} variant="primary" />
                      )}
                      {p.status === "PAID" && (
                        <ActionButton
                          label="Refund"
                          url={`/api/payments/${p.id}`}
                          method="PATCH"
                          body={{ status: "REFUNDED" }}
                          confirmText={`Mark ${p.receiptNumber} as refunded?`}
                        />
                      )}
                      <ActionButton
                        label="Void"
                        url={`/api/payments/${p.id}`}
                        method="DELETE"
                        variant="danger"
                        confirmText={`Void payment ${p.receiptNumber}? It stays in the database for auditing but is removed from lists and totals.`}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pages={pages} makeHref={(p) => qs({ page: String(p) })} />
    </>
  );
}
