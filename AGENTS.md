<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project conventions

- Money is integer cents (HKD) everywhere; use src/lib/money.ts helpers. Never use floats for amounts.
- Enum-like values are strings validated by zod; allowed values + labels + role permissions live in src/lib/constants.ts.
- All business rules live in src/server/services/*; API routes only auth-check, zod-parse, and delegate.
- Financially significant entities use soft delete (deletedAt) — never hard-delete students, teachers, classes, payments, or work logs.
- Every mutation writes an AuditLog entry via src/lib/audit.ts.
- Pages enforce auth with requireUser(permission); API routes with requireApiUser(permission). Teacher row-scoping happens in services.
- After changes: npm run typecheck && npm test && npm run build.
