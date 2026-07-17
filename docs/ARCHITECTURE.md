# Architecture

## Stack

| Layer      | Choice | Why |
|------------|--------|-----|
| Framework  | Next.js 16, App Router, TypeScript | One deployable unit for UI + API; server components keep data access on the server |
| Database   | SQLite via Prisma (PostgreSQL-ready) | Zero-setup for an in-house tool; the schema is portable — switch the datasource provider and re-migrate |
| ORM        | Prisma 6 | Typed queries, migrations, transactions |
| Validation | zod | Single schema per endpoint, drives 400 responses with field details |
| Auth       | HTTP-only cookie with a signed JWT (jose) + bcrypt password hashes | Session-style UX without extra infrastructure |
| Excel      | ExcelJS | Styled headers, number formats, totals rows |
| UI         | Tailwind CSS v4, small component set | Clean admin look, desktop-first, responsive down to tablets |

## Layering

```
Browser
  │  server-rendered pages (src/app/**/page.tsx)  ← read via services directly
  │  client mutations (fetch JSON)                ← forms & action buttons
  ▼
API route handlers (src/app/api/**/route.ts)
  │  requireApiUser(permission) → zod parse → service call
  ▼
Service layer (src/server/services/*.ts)          ← ALL business rules live here
  │  ownership scoping, state machines, capacity checks, audit logging
  ▼
Prisma (src/lib/db.ts) → SQLite/PostgreSQL
```

Cross-cutting libraries in `src/lib/`:

- `constants.ts` — enum-like values, display labels, and the role→permission matrix (single source of truth)
- `validation.ts` — zod schemas for every API input
- `money.ts` — all amounts are **integer cents**; parsing/formatting helpers
- `dates.ts` — calendar dates stored as UTC midnight; `"YYYY-MM"` month keys
- `payroll-calc.ts` — pure payroll/work-hours math (unit-tested, no DB)
- `auth.ts` — sessions, `requireUser` (pages) / `requireApiUser` (APIs)
- `api.ts` — route wrapper mapping zod errors→400, ApiError→status, unique-hit→409, rest→500
- `audit.ts` — audit writer + field-level diff helper
- `excel.ts` — report definition → styled workbook

## Data model (13 tables)

`User`, `Student`, `Teacher`, `DanceClass`, `Enrollment`, `Payment`,
`AttendanceRecord`, `WorkLog`, `PayrollRecord`, `PayrollAdjustment`,
`AuditLog`, `ExportLog` — see [prisma/schema.prisma](../prisma/schema.prisma), which is
commented per model.

Key decisions:

- **Money = integer cents.** No floats anywhere in financial math.
- **Soft delete** (`deletedAt`) on students, teachers, classes, payments, work logs.
  Financial records are voided, never destroyed. Audit rows are append-only.
- **Enum-as-string + zod.** SQLite lacks native enums; allowed values are enforced at the
  request boundary and documented in `constants.ts`.
- **Snapshots for payroll.** A payroll record stores the employment type and hourly rate
  at generation time, so later rate changes never rewrite history.
- **Attendance is idempotent** per `(class, student, date)` via a unique constraint + upsert.

## State machines

- Work log approval: `PENDING → APPROVED | REJECTED`; any edit resets to `PENDING`.
  All work logs of a month **lock** once that month's payroll is approved or paid.
- Payroll: `DRAFT → APPROVED → PAID`, with `APPROVED → DRAFT` revert. Adjustments only in
  `DRAFT`. `PAID` requires payment date + method and is final.
- Payments: free status moves among `PAID / PENDING / OVERDUE / REFUNDED` (staff need to
  correct mistakes), but every change is audited and voiding is soft.

## RBAC

Permissions are fine-grained strings (`students.read`, `payroll.write`, `worklogs.approve`, …)
mapped per role in `constants.ts`:

| Role | Scope |
|------|-------|
| ADMIN | all permissions |
| MANAGER | all business modules; no user management, no audit log |
| STAFF | students + payments read/write, attendance, classes read |
| TEACHER | own classes, own work logs (create/edit pending), own payroll (read) |

Enforcement happens **twice**: pages call `requireUser(permission)` (redirects to
/login or /forbidden) and every API route calls `requireApiUser(permission)` (401/403).
Teacher row-level scoping is enforced inside the service layer, not the UI.

## Future expansion

The seams are already in place:

- **Student/teacher portal** — teachers already have scoped read access; add a `STUDENT`
  role and reuse the same service scoping pattern.
- **Online payments** — add a `PaymentProvider` field + webhook route that calls
  `createPayment`; the audit/receipt pipeline is unchanged.
- **Notifications (WhatsApp/SMS/email)** — trigger from service-layer events
  (overdue payment, payroll approved); add a `notifications` service.
- **Multi-branch** — add a `Branch` table and a `branchId` FK on students/teachers/
  classes/payments; extend the permission matrix with branch scoping.
- **Accounting integration** — the report builders in `src/server/services/reports.ts`
  return structured data; add a CSV/API emitter alongside the Excel one.
- **PostgreSQL** — change the Prisma datasource provider and `DATABASE_URL`; re-run migrations.
