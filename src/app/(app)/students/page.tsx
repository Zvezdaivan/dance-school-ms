import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { STUDENT_STATUSES } from "@/lib/constants";
import { fmtDate } from "@/lib/dates";
import { Badge, EmptyState, FilterSelect, makeQs, PageHeader, Pagination } from "@/components/ui";
import { listStudents, StudentListParams } from "@/server/services/students";

export default async function StudentsPage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireUser("students.read");
  const sp = await props.searchParams;
  const params: StudentListParams = {
    q: sp.q,
    status: sp.status,
    sort: (sp.sort as StudentListParams["sort"]) ?? "fullName",
    order: (sp.order as StudentListParams["order"]) ?? "asc",
    page: sp.page ? Number(sp.page) : 1,
  };
  const { students, total, page, pages } = await listStudents(params);
  const qs = makeQs(sp);

  return (
    <>
      <PageHeader
        title="Students"
        subtitle={`${total} student(s)`}
        action={<Link href="/students/new" className="btn btn-primary">+ New student</Link>}
      />

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-64">
          <label className="label">Search</label>
          <input name="q" defaultValue={sp.q ?? ""} placeholder="Name, phone, email, guardian…" className="input" />
        </div>
        <FilterSelect name="status" title="Status" defaultValue={sp.status} values={STUDENT_STATUSES} />
        <div className="w-44">
          <label className="label">Sort by</label>
          <select name="sort" defaultValue={sp.sort ?? "fullName"} className="input">
            <option value="fullName">Name</option>
            <option value="enrollmentDate">Enrollment date</option>
            <option value="createdAt">Recently added</option>
          </select>
        </div>
        <button className="btn">Apply</button>
        {(sp.q || sp.status) && <Link href="/students" className="btn">Clear</Link>}
      </form>

      {students.length === 0 ? (
        <EmptyState message="No students match your filters." />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Name</th><th>Contact</th><th>Guardian</th><th>Enrolled</th><th>Status</th><th>Notes</th></tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link href={`/students/${s.id}`} className="font-medium text-gray-900 hover:text-indigo-600">{s.fullName}</Link>
                    {s.medicalNotes && <span title={s.medicalNotes} className="ml-1.5 cursor-help text-xs">⚕️</span>}
                  </td>
                  <td>{s.contactNumber}</td>
                  <td>{s.guardianName ?? "—"}</td>
                  <td>{fmtDate(s.enrollmentDate)}</td>
                  <td><Badge value={s.status} /></td>
                  <td className="max-w-56 truncate text-gray-500">{s.notes ?? ""}</td>
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
