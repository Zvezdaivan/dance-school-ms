# Changelog

## Sprint 2 — code reduction & response speed (2026-07-18)

Four-angle cleanup review (reuse / simplification / efficiency / altitude), applied:

- **Faster page loads**: session validation now cached per request (was 2–3 DB
  round-trips per page, now 1) and fetches only needed columns; independent
  queries parallelized on student/class/work-log/attendance pages; payroll
  generation batches its reads (2 queries instead of ~2 per teacher);
  attendance saves run as one batched transaction; recent-attendance list
  aggregates in SQL instead of fetching 500 rows; payroll/expense/tax reports
  filter by month in SQL (indexed) instead of in JavaScript.
- **Sturdier error handling**: typed DomainError replaces regex matching on
  error messages (two payroll validation errors previously surfaced as 500s);
  foreign-key violations map to a clear 400.
- **One implementation per rule**: teacher row-scoping (`scopeTeacherId`),
  outstanding-payment definition, pagination math, blank-form-value handling,
  fetch-or-404, date-range filters, and audit diffs (now derived from the
  update payload, so new fields are audited automatically).
- **Less markup**: shared EnumOptions/FilterSelect/makeQs components replace
  ~30 copy-pasted select/query-string blocks; dead code removed (unused
  exports, dead attendance-notes plumbing, a no-op string replace).

Deferred by choice: Prisma soft-delete extension, shared payments-table
component, per-mutation write+audit transactions, zod query-param schemas,
SectionCard markup sweep (all noted in the review; low value or high churn).

## Milestone 1 — UAT release (2026-07-17) — git tag `milestone-1`

First complete version, sent to the principal for user acceptance testing.

**Scope**
- Students, payments (outstanding tracking, void-not-delete), classes/enrollment
  (capacity checks), attendance sheets, teachers, work-hour logging + approval,
  payroll (DRAFT → APPROVED → PAID with month locking and adjustments),
  9 Excel reports, role-based access (Admin/Manager/Staff/Teacher), audit log,
  seeded demo data, unit tests (23).
- Portable Windows package (`npm run package:win`): `DanceSchoolMS.exe` launcher,
  bundled Node runtime, seeded database — double-click to run, fully offline.

**Fixes during UAT prep**
- Excel sheet names with `/` crashed export → sanitized.
- Stale sessions (after reseed / deactivation) caused 500s → sessions now
  re-validated against the database on every request.
- Reports page navigated to raw JSON on errors → client-side download with
  inline success/error messages.
- Launcher health-checked `localhost` (IPv6 `::1` first) and killed a healthy
  server → uses literal `127.0.0.1` everywhere.
- "Not linked to a class" work-log entry crashed with a foreign-key 500 →
  blank form values are stripped before validation; FK violations now map to
  a clear 400.

**Rollback to this version**
```
git checkout milestone-1
npm install
npm run package:win     # rebuilds the portable package from this snapshot
```
The exact package shipped for UAT is also archived at
`releases/milestone-1/DanceSchoolMS-UAT-2026-07-17.zip` (kept outside git).
