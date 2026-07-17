# Testing & Validation Plan

## Automated

`npm test` runs unit tests over the pure business math in `src/lib/`:

- `money.test.ts` — dollar-string → cents parsing (rejects >2 dp, garbage), HKD formatting
- `payroll-calc.test.ts` — payable minutes (break/ordering rules), hourly vs monthly base
  pay with rounding, adjustment aggregation into gross/net
- `dates.test.ts` — date/month/time parsing and month-range boundaries

`npm run typecheck` and `npm run build` must pass cleanly.

## Verified end-to-end (repeat after significant changes)

The following scenarios were executed against the running app with seed data:

### Auth & RBAC
- [x] Login with each of the four roles; wrong password → 401; anonymous API call → 401
- [x] Staff: students API 200; payroll, reports, users, teacher-write all 403
- [x] Teacher: sees only own work logs and payroll; students API 403; approving logs 403
- [x] Nav sidebar only shows permitted modules per role

### Students & payments
- [x] Create student via API/form; validation errors (empty name, bad date) → 400 with field details
- [x] Record a PENDING payment → appears in outstanding totals; mark PAID → totals update
- [x] Auto-generated receipt numbers are unique (`RCP-YYYYMMDD-nnn`)
- [x] Void keeps the row in the database (`deletedAt` set) and writes an audit entry

### Work hours & payroll
- [x] Approve pending logs; approved hours feed payroll generation
- [x] Generate payroll for a month: hourly = rate × approved hours, monthly = salary
- [x] Add allowance to draft → gross/net recompute; approve → adjustments locked; mark paid
- [x] Editing/deciding a work log in a paid month → 409 with a clear message

### Reports
- [x] All 9 report types return valid `.xlsx` (ZIP magic bytes, non-trivial size) with date-range filters
- [x] All 9 files open in desktop Excel with no repair prompts (verified via Excel COM automation)
- [x] Download failures (expired session, server error) show an inline message on the Reports page instead of navigating to raw JSON

### Sessions
- [x] A session whose user no longer exists or is deactivated is rejected on the next request (redirect to login / 401) — sessions are re-validated against the database on every request

## Manual regression checklist (for staff acceptance)

1. Enroll a student into a full class → expect "Class is full" error.
2. Enroll the same student twice → expect duplicate error.
3. Take attendance for a session, re-open the same date → statuses reload; saving again updates, not duplicates.
4. Edit an approved work log as manager → status resets to Pending.
5. Manually adjust payable minutes without a reason → blocked.
6. Deactivate a user → they can no longer sign in; reactivate restores access.
7. Try to deactivate your own admin account → blocked.
8. Delete a teacher who still has active classes → blocked with guidance.
9. Open the audit log after the above → every step is present with the acting user.
