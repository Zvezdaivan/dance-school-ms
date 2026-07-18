import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./db";
import { SessionUser } from "./auth";

type Db = PrismaClient | Prisma.TransactionClient;

export interface AuditEntry {
  action: "CREATE" | "UPDATE" | "DELETE" | "APPROVE" | "REJECT" | "STATUS_CHANGE" | "LOGIN" | "EXPORT";
  entityType: string;
  entityId: string;
  summary: string;
  changes?: Record<string, [unknown, unknown]> | null;
}

/** Write an audit log entry. Pass `db` to include it in an ongoing transaction. */
export async function logAudit(user: SessionUser, entry: AuditEntry, db: Db = prisma): Promise<void> {
  await db.auditLog.create({
    data: {
      userId: user.id,
      userEmail: user.email,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      summary: entry.summary,
      changes: entry.changes && Object.keys(entry.changes).length > 0 ? JSON.stringify(entry.changes) : null,
    },
  });
}

/**
 * Field-level diff of two objects for the audit trail: { field: [old, new] }.
 * Fields default to every key in the update payload, so new columns are
 * audited automatically; pass `exclude` for noise fields (e.g. status resets).
 */
export function diffChanges<T extends Record<string, unknown>>(
  before: T,
  after: Partial<T>,
  exclude: string[] = []
): Record<string, [unknown, unknown]> {
  const diff: Record<string, [unknown, unknown]> = {};
  for (const field of Object.keys(after)) {
    if (exclude.includes(field)) continue;
    const oldVal = normalize(before[field]);
    const newVal = normalize(after[field]);
    if (oldVal !== newVal) diff[field] = [oldVal, newVal];
  }
  return diff;
}

function normalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  return value ?? null;
}
