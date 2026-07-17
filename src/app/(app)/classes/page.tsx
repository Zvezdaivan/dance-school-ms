import Link from "next/link";
import { can, requireUser } from "@/lib/auth";
import { CLASS_STATUSES, DAYS_OF_WEEK, label } from "@/lib/constants";
import { formatCents } from "@/lib/money";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { listClasses } from "@/server/services/classes";

export default async function ClassesPage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser("classes.read");
  const sp = await props.searchParams;
  const classes = await listClasses(user, { q: sp.q, status: sp.status });

  return (
    <>
      <PageHeader
        title="Classes"
        subtitle={`${classes.length} class(es)`}
        action={can(user, "classes.write") && <Link href="/classes/new" className="btn btn-primary">+ New class</Link>}
      />

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-64">
          <label className="label">Search</label>
          <input name="q" defaultValue={sp.q ?? ""} placeholder="Name or style…" className="input" />
        </div>
        <div className="w-36">
          <label className="label">Status</label>
          <select name="status" defaultValue={sp.status ?? ""} className="input">
            <option value="">All</option>
            {CLASS_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
          </select>
        </div>
        <button className="btn">Apply</button>
        <Link href="/classes" className="btn">Clear</Link>
      </form>

      {classes.length === 0 ? (
        <EmptyState message="No classes match your filters." />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Class</th><th>Style / Level</th><th>Teacher</th><th>Schedule</th><th>Enrolled</th><th className="text-right">Fee</th><th>Status</th></tr>
            </thead>
            <tbody>
              {classes.map((c) => (
                <tr key={c.id}>
                  <td><Link href={`/classes/${c.id}`} className="font-medium text-gray-900 hover:text-indigo-600">{c.name}</Link></td>
                  <td>{c.style} · {label(c.level)}</td>
                  <td>{c.teacher.fullName}</td>
                  <td>{c.dayOfWeek != null ? `${DAYS_OF_WEEK[c.dayOfWeek]} ${c.startTime}–${c.endTime}` : c.scheduleNotes ?? "—"}</td>
                  <td>
                    <span className={c._count.enrollments >= c.capacity ? "font-semibold text-red-600" : ""}>
                      {c._count.enrollments}/{c.capacity}
                    </span>
                  </td>
                  <td className="text-right">{formatCents(c.feeCents)} <span className="text-xs text-gray-400">({label(c.feeType)})</span></td>
                  <td><Badge value={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
