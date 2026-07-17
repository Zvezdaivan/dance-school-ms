import Link from "next/link";
import { can, requireUser } from "@/lib/auth";
import { formatCents } from "@/lib/money";
import { fmtDate } from "@/lib/dates";
import { label } from "@/lib/constants";
import { Badge, DetailRow, PageHeader } from "@/components/ui";
import { ActionButton } from "@/components/actions";
import { getStudent } from "@/server/services/students";

export default async function StudentDetailPage(props: { params: Promise<{ id: string }> }) {
  const user = await requireUser("students.read");
  const { id } = await props.params;
  const student = await getStudent(id);
  const writable = can(user, "students.write");

  return (
    <>
      <PageHeader
        title={student.fullName}
        subtitle={`Enrolled ${fmtDate(student.enrollmentDate)}`}
        action={
          <>
            {can(user, "payments.write") && (
              <Link href={`/payments/new?studentId=${student.id}`} className="btn">+ Record payment</Link>
            )}
            {writable && <Link href={`/students/${student.id}/edit`} className="btn btn-primary">Edit</Link>}
            {writable && (
              <ActionButton
                label="Delete"
                url={`/api/students/${student.id}`}
                method="DELETE"
                variant="danger"
                confirmText={`Archive ${student.fullName}? The record is kept for history but hidden from lists.`}
                redirectTo="/students"
              />
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <h2 className="mb-2 text-sm font-semibold text-gray-900">Profile</h2>
          <dl>
            <DetailRow term="Status"><Badge value={student.status} /></DetailRow>
            <DetailRow term="Contact">{student.contactNumber}</DetailRow>
            <DetailRow term="Email">{student.email ?? "—"}</DetailRow>
            <DetailRow term="Date of birth">{fmtDate(student.dateOfBirth)}</DetailRow>
            <DetailRow term="Guardian">{student.guardianName ?? "—"}</DetailRow>
            <DetailRow term="Guardian phone">{student.guardianPhone ?? "—"}</DetailRow>
            <DetailRow term="Address">{student.address ?? "—"}</DetailRow>
            <DetailRow term="Outstanding">
              <span className={student.outstandingCents > 0 ? "text-red-600" : ""}>{formatCents(student.outstandingCents)}</span>
            </DetailRow>
          </dl>
          {student.notes && <p className="mt-3 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">{student.notes}</p>}
          {student.medicalNotes && (
            <p className="mt-2 rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-700">⚕️ {student.medicalNotes}</p>
          )}
        </div>

        <div className="space-y-6 lg:col-span-2">
          <div className="card">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Class enrollments</h2>
            {student.enrollments.length === 0 ? (
              <p className="text-sm text-gray-500">Not enrolled in any class.</p>
            ) : (
              <table className="table">
                <thead><tr><th>Class</th><th>Teacher</th><th>Enrolled</th><th>Status</th></tr></thead>
                <tbody>
                  {student.enrollments.map((e) => (
                    <tr key={e.id}>
                      <td><Link href={`/classes/${e.classId}`} className="font-medium hover:text-indigo-600">{e.class.name}</Link></td>
                      <td>{e.class.teacher.fullName}</td>
                      <td>{fmtDate(e.enrolledAt)}</td>
                      <td><Badge value={e.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Payment history</h2>
            {student.payments.length === 0 ? (
              <p className="text-sm text-gray-500">No payments recorded.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead><tr><th>Date</th><th>Receipt</th><th>Type</th><th>Method</th><th>Status</th><th className="text-right">Amount</th></tr></thead>
                  <tbody>
                    {student.payments.map((p) => (
                      <tr key={p.id}>
                        <td>{fmtDate(p.paymentDate)}</td>
                        <td className="font-mono text-xs">{p.receiptNumber}</td>
                        <td>{label(p.paymentType)}</td>
                        <td>{label(p.method)}</td>
                        <td><Badge value={p.status} /></td>
                        <td className="text-right font-medium">{formatCents(p.amountCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Recent attendance</h2>
            {student.attendance.length === 0 ? (
              <p className="text-sm text-gray-500">No attendance records.</p>
            ) : (
              <table className="table">
                <thead><tr><th>Date</th><th>Class</th><th>Status</th></tr></thead>
                <tbody>
                  {student.attendance.map((a) => (
                    <tr key={a.id}>
                      <td>{fmtDate(a.sessionDate)}</td>
                      <td>{a.class.name}</td>
                      <td><Badge value={a.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
