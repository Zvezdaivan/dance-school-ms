# REST API Reference

All endpoints are JSON under `/api`, authenticated by the session cookie set at login.
Errors: `400` validation (with `details: [{field, message}]`), `401` unauthenticated,
`403` forbidden, `404` not found, `409` conflict/state violation, `500` unexpected.

Dates are `YYYY-MM-DD`, months `YYYY-MM`, times `HH:mm` (24h). Monetary inputs are dollar
strings/numbers (`"880"`, `"1,234.50"`); monetary outputs are integer cents (`amountCents`).

## Auth
| Method | Path | Body / query | Permission |
|--------|------|--------------|------------|
| POST | `/api/auth/login` | `{email, password}` — sets session cookie | — |
| POST | `/api/auth/logout` | clears cookie | — |

## Students
| Method | Path | Notes | Permission |
|--------|------|-------|------------|
| GET | `/api/students` | `?q&status&sort&order&page` — paginated | students.read |
| POST | `/api/students` | create | students.write |
| GET | `/api/students/:id` | profile + payments + enrollments + attendance + outstanding | students.read |
| PATCH | `/api/students/:id` | partial update (audited diff) | students.write |
| DELETE | `/api/students/:id` | soft delete | students.write |

## Payments
| Method | Path | Notes | Permission |
|--------|------|-------|------------|
| GET | `/api/payments` | `?studentId&status&method&paymentType&from&to&page` — includes per-status totals | payments.read |
| POST | `/api/payments` | create; `receiptNumber` auto-generated if blank | payments.write |
| PATCH | `/api/payments/:id` | update/status change | payments.write |
| DELETE | `/api/payments/:id` | void (soft delete) | payments.write |

## Teachers
| Method | Path | Notes | Permission |
|--------|------|-------|------------|
| GET | `/api/teachers` | `?q&status&employmentType` | teachers.read |
| POST | `/api/teachers` | create; rate/salary required per employment type | teachers.write |
| GET | `/api/teachers/:id` | profile + classes + recent logs + payroll history | teachers.read |
| PATCH | `/api/teachers/:id` | update | teachers.write |
| DELETE | `/api/teachers/:id` | soft delete; blocked while active classes exist | teachers.write |

## Classes & enrollments
| Method | Path | Notes | Permission |
|--------|------|-------|------------|
| GET | `/api/classes` | `?q&status&teacherId`; teachers see only their own | classes.read |
| POST | `/api/classes` | create | classes.write |
| GET/PATCH/DELETE | `/api/classes/:id` | detail / update / soft delete (drops active enrollments) | classes.read/write |
| POST | `/api/enrollments` | `{studentId, classId, enrolledAt}` — capacity + duplicate checked | classes.write |
| PATCH | `/api/enrollments/:id` | `{status}` (e.g. DROPPED) | classes.write |

## Attendance
| Method | Path | Notes | Permission |
|--------|------|-------|------------|
| GET | `/api/attendance?classId&sessionDate` | roster + existing statuses | attendance.read |
| POST | `/api/attendance` | `{classId, sessionDate, records:[{studentId, status}]}` — transactional upsert | attendance.write |

## Work logs
| Method | Path | Notes | Permission |
|--------|------|-------|------------|
| GET | `/api/work-logs` | `?teacherId&approvalStatus&month&page`; teachers auto-scoped to self | worklogs.read |
| POST | `/api/work-logs` | create; payable minutes computed server-side | worklogs.write |
| PATCH | `/api/work-logs/:id` | edit (resets to PENDING); manager may set `adjustedMinutes` + `adjustmentReason` | worklogs.write |
| DELETE | `/api/work-logs/:id` | soft delete | worklogs.write |
| POST | `/api/work-logs/:id/decision` | `{decision: APPROVED\|REJECTED}` | worklogs.approve |

All work-log mutations are rejected with 409 once the month's payroll is approved/paid.

## Payroll
| Method | Path | Notes | Permission |
|--------|------|-------|------------|
| GET | `/api/payroll` | `?month&status&teacherId`; teachers auto-scoped | payroll.read |
| POST | `/api/payroll` | `{month, teacherId?}` — generate/regenerate drafts | payroll.write |
| GET | `/api/payroll/:id` | detail + adjustments | payroll.read |
| PATCH | `/api/payroll/:id` | `{status}`; PAID requires `paymentDate` + `paymentMethod` | payroll.write |
| POST | `/api/payroll/:id/adjustments` | `{type, amount, reason}` — draft only | payroll.write |
| DELETE | `/api/payroll/:id/adjustments/:adjustmentId` | draft only | payroll.write |

## Reports
| Method | Path | Notes | Permission |
|--------|------|-------|------------|
| GET | `/api/reports/:type?from&to` | streams an .xlsx; export is audit-logged | reports.export |

Types: `students`, `payments`, `outstanding`, `teachers`, `work-hours`, `payroll`,
`monthly-income`, `monthly-expense`, `tax-summary`.

## Users (admin)
| Method | Path | Notes | Permission |
|--------|------|-------|------------|
| GET | `/api/users` | list | users.manage |
| POST | `/api/users` | create; TEACHER role must link a teacher record | users.manage |
| PATCH | `/api/users/:id` | role/status/password; self-demotion blocked | users.manage |
