"use client";

import { ErrorBanner, Field, useJsonSubmit } from "@/components/forms";

export function EnrollForm({
  classId,
  students,
  defaultDate,
}: {
  classId: string;
  students: { id: string; fullName: string; contactNumber: string }[];
  defaultDate: string;
}) {
  const { onSubmit, busy, error, fieldErrors } = useJsonSubmit({
    url: "/api/enrollments",
    transform: (data) => ({ ...data, classId }),
  });

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <ErrorBanner error={error} fieldErrors={fieldErrors} />
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <Field label="Student">
            <select name="studentId" required defaultValue="" className="input">
              <option value="" disabled>Select a student…</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.fullName} ({s.contactNumber})</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="w-40">
          <Field label="Enrollment date">
            <input name="enrolledAt" type="date" required defaultValue={defaultDate} className="input" />
          </Field>
        </div>
        <button className="btn btn-primary" disabled={busy}>{busy ? "Enrolling…" : "Enroll"}</button>
      </div>
    </form>
  );
}
