import Link from "next/link";
import { can, requireUser } from "@/lib/auth";
import { formatCents } from "@/lib/money";
import { fmtDate, toDateInput } from "@/lib/dates";
import { DAYS_OF_WEEK, label } from "@/lib/constants";
import { Badge, DetailRow, PageHeader } from "@/components/ui";
import { ActionButton } from "@/components/actions";
import { EnrollForm } from "@/components/EnrollForm";
import { getClass } from "@/server/services/classes";
import { studentOptions } from "@/server/services/students";

export default async function ClassDetailPage(props: { params: Promise<{ id: string }> }) {
  const user = await requireUser("classes.read");
  const { id } = await props.params;
  const writable = can(user, "classes.write");
  const [cls, students] = await Promise.all([getClass(user, id), writable ? studentOptions() : []]);
  const activeEnrollments = cls.enrollments.filter((e) => e.status === "ACTIVE");
  const enrolledIds = new Set(activeEnrollments.map((e) => e.studentId));
  const enrollable = students.filter((s) => !enrolledIds.has(s.id));

  return (
    <>
      <PageHeader
        title={cls.name}
        subtitle={`${cls.style} · ${label(cls.level)} · ${cls.teacher.fullName}`}
        action={
          writable && (
            <>
              <Link href={`/classes/${cls.id}/edit`} className="btn btn-primary">Edit</Link>
              <ActionButton
                label="Delete"
                url={`/api/classes/${cls.id}`}
                method="DELETE"
                variant="danger"
                confirmText={`Archive ${cls.name}? Active enrollments will be dropped; history is kept.`}
                redirectTo="/classes"
              />
            </>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <h2 className="mb-2 text-sm font-semibold text-gray-900">Details</h2>
          <dl>
            <DetailRow term="Status"><Badge value={cls.status} /></DetailRow>
            <DetailRow term="Schedule">
              {cls.dayOfWeek != null ? `${DAYS_OF_WEEK[cls.dayOfWeek]} ${cls.startTime}–${cls.endTime}` : "Not fixed"}
            </DetailRow>
            <DetailRow term="Capacity">{activeEnrollments.length}/{cls.capacity}</DetailRow>
            <DetailRow term="Fee">{formatCents(cls.feeCents)} ({label(cls.feeType)})</DetailRow>
          </dl>
          {cls.scheduleNotes && <p className="mt-3 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">{cls.scheduleNotes}</p>}
          {can(user, "attendance.write") && (
            <Link href={`/attendance?classId=${cls.id}`} className="btn mt-4 w-full">Take attendance →</Link>
          )}
        </div>

        <div className="card lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Enrollments</h2>
          {writable && cls.status === "ACTIVE" && (
            <div className="mb-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
              <EnrollForm classId={cls.id} students={enrollable} defaultDate={toDateInput(new Date())} />
            </div>
          )}
          {cls.enrollments.length === 0 ? (
            <p className="text-sm text-gray-500">No students enrolled yet.</p>
          ) : (
            <table className="table">
              <thead><tr><th>Student</th><th>Enrolled</th><th>Status</th>{writable && <th></th>}</tr></thead>
              <tbody>
                {cls.enrollments.map((e) => (
                  <tr key={e.id}>
                    <td><Link href={`/students/${e.studentId}`} className="font-medium hover:text-indigo-600">{e.student.fullName}</Link></td>
                    <td>{fmtDate(e.enrolledAt)}{e.droppedAt && <span className="text-xs text-gray-400"> → dropped {fmtDate(e.droppedAt)}</span>}</td>
                    <td><Badge value={e.status} /></td>
                    {writable && (
                      <td className="text-right">
                        {e.status === "ACTIVE" && (
                          <ActionButton
                            label="Drop"
                            url={`/api/enrollments/${e.id}`}
                            method="PATCH"
                            body={{ status: "DROPPED" }}
                            confirmText={`Drop ${e.student.fullName} from ${cls.name}?`}
                          />
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
