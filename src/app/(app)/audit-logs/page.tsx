import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fmtDateTime } from "@/lib/dates";
import { EmptyState, PageHeader, Pagination } from "@/components/ui";

const PAGE_SIZE = 50;

export default async function AuditLogsPage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireUser("audit.read");
  const sp = await props.searchParams;
  const page = Math.max(1, Number(sp.page ?? 1));
  const where = sp.entityType ? { entityType: sp.entityType } : {};
  const [total, logs, entityTypes] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.auditLog.findMany({ distinct: ["entityType"], select: { entityType: true }, orderBy: { entityType: "asc" } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (overrides: Record<string, string>) =>
    "?" + new URLSearchParams({ ...(sp as Record<string, string>), ...overrides }).toString();

  return (
    <>
      <PageHeader title="Audit Log" subtitle={`${total} entries — who changed what, and when`} />

      <form method="get" className="mb-4 flex items-end gap-3">
        <div className="w-48">
          <label className="label">Entity type</label>
          <select name="entityType" defaultValue={sp.entityType ?? ""} className="input">
            <option value="">All</option>
            {entityTypes.map((e) => <option key={e.entityType} value={e.entityType}>{e.entityType}</option>)}
          </select>
        </div>
        <button className="btn">Apply</button>
        <Link href="/audit-logs" className="btn">Clear</Link>
      </form>

      {logs.length === 0 ? (
        <EmptyState message="No audit entries." />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Entity</th><th>Summary</th><th>Changes</th></tr></thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="text-xs text-gray-500">{fmtDateTime(l.createdAt)}</td>
                  <td className="text-xs">{l.userEmail}</td>
                  <td><span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">{l.action}</span></td>
                  <td className="text-xs">{l.entityType}</td>
                  <td className="max-w-md text-xs whitespace-normal">{l.summary}</td>
                  <td className="max-w-xs truncate font-mono text-[10px] text-gray-400" title={l.changes ?? ""}>{l.changes ?? ""}</td>
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
