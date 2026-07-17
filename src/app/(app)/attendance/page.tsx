import { requireUser } from "@/lib/auth";
import { fmtDate, toDateInput } from "@/lib/dates";
import { PageHeader } from "@/components/ui";
import { AttendanceSheet } from "@/components/AttendanceSheet";
import { classOptions } from "@/server/services/classes";
import { listRecentSessions } from "@/server/services/attendance";
import Link from "next/link";

export default async function AttendancePage(props: { searchParams: Promise<{ classId?: string }> }) {
  const user = await requireUser("attendance.read");
  const { classId } = await props.searchParams;
  const [classes, sessions] = await Promise.all([classOptions(user), listRecentSessions()]);

  return (
    <>
      <PageHeader title="Attendance" subtitle="Take or update attendance for a class session" />
      <AttendanceSheet classes={classes} initialClassId={classId} initialDate={toDateInput(new Date())} />

      <div className="card mt-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Recent sessions</h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-gray-500">No attendance recorded yet.</p>
        ) : (
          <table className="table">
            <thead><tr><th>Date</th><th>Class</th><th>Present</th><th>Late</th><th>Absent</th><th>Excused</th></tr></thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={`${s.classId}:${s.sessionDate.toISOString()}`}>
                  <td>{fmtDate(s.sessionDate)}</td>
                  <td>
                    <Link href={`/attendance?classId=${s.classId}`} className="font-medium hover:text-indigo-600">{s.className}</Link>
                  </td>
                  <td>{s.counts.PRESENT ?? 0}</td>
                  <td>{s.counts.LATE ?? 0}</td>
                  <td>{s.counts.ABSENT ?? 0}</td>
                  <td>{s.counts.EXCUSED ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
