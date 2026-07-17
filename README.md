# Dance School Management System

Internal full-stack management system for a dance school: students, payments, classes,
attendance, teachers, working hours, payroll, and Excel reporting for accounting.

Built with **Next.js 16 (App Router) + TypeScript + Prisma + SQLite + Tailwind CSS + ExcelJS**.

## Quick start

```bash
npm install
npx prisma migrate dev   # creates prisma/dev.db and applies migrations
npm run db:seed          # loads demo data + sign-in accounts
npm run dev              # http://localhost:3000
```

### Demo accounts (after seeding)

| Role    | Email                  | Password      | Access |
|---------|------------------------|---------------|--------|
| Admin   | `admin@dance.school`   | `Admin1234!`  | Everything, incl. user management and audit log |
| Manager | `manager@dance.school` | `Manager1234!`| All business modules (no user management/audit) |
| Staff   | `staff@dance.school`   | `Staff1234!`  | Students, payments, attendance; read-only classes |
| Teacher | `mandy@dance.school`   | `Teacher1234!`| Own classes, own work hours, own payroll |

## Commands

| Command             | Purpose |
|---------------------|---------|
| `npm run dev`       | Development server |
| `npm run build`     | Production build |
| `npm start`         | Serve the production build |
| `npm test`          | Unit tests (money, dates, payroll math) |
| `npm run typecheck` | TypeScript check |
| `npm run db:migrate`| Create/apply migrations |
| `npm run db:seed`   | Reset content and load demo data |
| `npm run db:reset`  | Drop + re-migrate + re-seed the database |
| `npm run package:win` | Build a portable double-clickable Windows package (`dist\DanceSchoolMS` + zip): bundled Node runtime, seeded database, and a `DanceSchoolMS.exe` launcher that starts the server, opens the browser, and stops the server when its window closes. No Node/npm needed on the target PC. |

## Configuration

Copy `.env.example` to `.env`:

- `DATABASE_URL` — SQLite by default (`file:./dev.db`). To move to PostgreSQL, change
  `provider` in [prisma/schema.prisma](prisma/schema.prisma) to `postgresql`, point
  `DATABASE_URL` at the server, and run `npx prisma migrate dev`. No model changes needed.
- `SESSION_SECRET` — signs session cookies. Generate a strong value for production.

## How the key workflows fit together

1. **Students** are enrolled into **classes** (capacity-checked). **Attendance** is taken per session.
2. **Payments** are recorded per student. A payment saved as *Pending*/*Overdue* is an
   expected amount — it drives the outstanding-balance tracking on the dashboard, the
   student page, and the Outstanding report. Mark it *Paid* when the money arrives.
   Payments are voided, never deleted.
3. **Teachers** log **working hours** (start/end/break → payable hours). A manager
   **approves** each record; managers may also manually adjust payable minutes with a
   mandatory reason.
4. **Payroll** is generated per month: hourly/contractor pay = approved hours × rate
   snapshot; monthly staff get their salary. Allowances/bonuses/deductions are added as
   line items on the draft. Lifecycle: `DRAFT → APPROVED → PAID` (approved can revert to
   draft; paid is final). Once a month's payroll is approved/paid, that month's work
   logs are locked.
5. **Reports** (9 types) export as formatted Excel with headers, totals, and summaries;
   every export is written to the audit trail.
6. **Audit log** records every create/update/delete/approval/status change with the
   acting user and a field-level diff.

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — layers, data model, RBAC design
- [docs/API.md](docs/API.md) — REST endpoint reference
- [docs/TESTING.md](docs/TESTING.md) — test cases and manual validation plan
- Future expansion ideas are listed at the end of ARCHITECTURE.md
