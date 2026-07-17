// Presentational building blocks (server-safe, no client JS).

import Link from "next/link";
import { ReactNode } from "react";
import { label } from "@/lib/constants";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}

const BADGE_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  PAID: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  PRESENT: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  PENDING: "bg-amber-50 text-amber-700 ring-amber-600/20",
  DRAFT: "bg-amber-50 text-amber-700 ring-amber-600/20",
  LATE: "bg-amber-50 text-amber-700 ring-amber-600/20",
  OVERDUE: "bg-red-50 text-red-700 ring-red-600/20",
  REJECTED: "bg-red-50 text-red-700 ring-red-600/20",
  ABSENT: "bg-red-50 text-red-700 ring-red-600/20",
  SUSPENDED: "bg-red-50 text-red-700 ring-red-600/20",
  INACTIVE: "bg-gray-100 text-gray-600 ring-gray-500/20",
  DROPPED: "bg-gray-100 text-gray-600 ring-gray-500/20",
  REFUNDED: "bg-sky-50 text-sky-700 ring-sky-600/20",
  EXCUSED: "bg-sky-50 text-sky-700 ring-sky-600/20",
  GRADUATED: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  COMPLETED: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
};

export function Badge({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-gray-400">—</span>;
  const color = BADGE_COLORS[value] ?? "bg-gray-100 text-gray-600 ring-gray-500/20";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${color}`}>
      {label(value)}
    </span>
  );
}

export function StatCard({ title, value, hint, tone }: { title: string; value: string | number; hint?: string; tone?: "danger" | "warn" }) {
  const valueColor = tone === "danger" ? "text-red-600" : tone === "warn" ? "text-amber-600" : "text-gray-900";
  return (
    <div className="card">
      <div className="text-xs font-semibold tracking-wide text-gray-500 uppercase">{title}</div>
      <div className={`mt-1.5 text-2xl font-bold ${valueColor}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-gray-500">{hint}</div>}
    </div>
  );
}

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 py-10 text-center">
      <p className="text-sm text-gray-500">{message}</p>
      {action}
    </div>
  );
}

export function Pagination({ page, pages, makeHref }: { page: number; pages: number; makeHref: (p: number) => string }) {
  if (pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
      <span>
        Page {page} of {pages}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link className="btn btn-sm" href={makeHref(page - 1)}>
            ← Previous
          </Link>
        )}
        {page < pages && (
          <Link className="btn btn-sm" href={makeHref(page + 1)}>
            Next →
          </Link>
        )}
      </div>
    </div>
  );
}

export function DetailRow({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-gray-100 py-2 text-sm last:border-b-0">
      <dt className="shrink-0 text-gray-500">{term}</dt>
      <dd className="text-right font-medium text-gray-900">{children}</dd>
    </div>
  );
}
