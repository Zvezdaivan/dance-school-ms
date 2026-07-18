import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { EMPLOYMENT_TYPES, TEACHER_STATUSES, label } from "@/lib/constants";
import { fmtDate } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { Badge, EmptyState, FilterSelect, PageHeader } from "@/components/ui";
import { listTeachers } from "@/server/services/teachers";

export default async function TeachersPage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireUser("teachers.read");
  const sp = await props.searchParams;
  const teachers = await listTeachers({ q: sp.q, status: sp.status, employmentType: sp.employmentType });

  return (
    <>
      <PageHeader
        title="Teachers"
        subtitle={`${teachers.length} teacher(s)`}
        action={<Link href="/teachers/new" className="btn btn-primary">+ New teacher</Link>}
      />

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-64">
          <label className="label">Search</label>
          <input name="q" defaultValue={sp.q ?? ""} placeholder="Name, phone, email…" className="input" />
        </div>
        <FilterSelect name="employmentType" title="Employment" defaultValue={sp.employmentType} values={EMPLOYMENT_TYPES} width="w-44" />
        <FilterSelect name="status" title="Status" defaultValue={sp.status} values={TEACHER_STATUSES} width="w-36" />
        <button className="btn">Apply</button>
        <Link href="/teachers" className="btn">Clear</Link>
      </form>

      {teachers.length === 0 ? (
        <EmptyState message="No teachers match your filters." />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Name</th><th>Contact</th><th>Employment</th><th className="text-right">Rate / Salary</th><th>Start date</th><th>Status</th></tr>
            </thead>
            <tbody>
              {teachers.map((t) => (
                <tr key={t.id}>
                  <td><Link href={`/teachers/${t.id}`} className="font-medium text-gray-900 hover:text-indigo-600">{t.fullName}</Link></td>
                  <td>{t.contactNumber}</td>
                  <td>{label(t.employmentType)}</td>
                  <td className="text-right">
                    {t.employmentType === "MONTHLY"
                      ? `${formatCents(t.monthlySalaryCents)}/mo`
                      : `${formatCents(t.hourlyRateCents)}/hr`}
                  </td>
                  <td>{fmtDate(t.startDate)}</td>
                  <td><Badge value={t.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
