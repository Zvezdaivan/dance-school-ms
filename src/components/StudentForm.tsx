"use client";

import { ErrorBanner, Field, useJsonSubmit } from "@/components/forms";
import { STUDENT_STATUSES, label } from "@/lib/constants";

export interface StudentFormValues {
  id?: string;
  fullName?: string;
  contactNumber?: string;
  email?: string | null;
  dateOfBirth?: string;
  guardianName?: string | null;
  guardianPhone?: string | null;
  address?: string | null;
  enrollmentDate?: string;
  status?: string;
  notes?: string | null;
  medicalNotes?: string | null;
}

export function StudentForm({ initial }: { initial?: StudentFormValues }) {
  const isEdit = Boolean(initial?.id);
  const { onSubmit, busy, error, fieldErrors } = useJsonSubmit({
    url: isEdit ? `/api/students/${initial!.id}` : "/api/students",
    method: isEdit ? "PATCH" : "POST",
    redirectTo: isEdit ? `/students/${initial!.id}` : (res) => `/students/${(res as { id: string }).id}`,
  });

  return (
    <form onSubmit={onSubmit} className="card max-w-3xl space-y-4">
      <ErrorBanner error={error} fieldErrors={fieldErrors} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <input name="fullName" required defaultValue={initial?.fullName ?? ""} className="input" />
        </Field>
        <Field label="Contact number">
          <input name="contactNumber" required defaultValue={initial?.contactNumber ?? ""} className="input" />
        </Field>
        <Field label="Email">
          <input name="email" type="email" defaultValue={initial?.email ?? ""} className="input" />
        </Field>
        <Field label="Date of birth">
          <input name="dateOfBirth" type="date" defaultValue={initial?.dateOfBirth ?? ""} className="input" />
        </Field>
        <Field label="Guardian name" hint="For minors">
          <input name="guardianName" defaultValue={initial?.guardianName ?? ""} className="input" />
        </Field>
        <Field label="Guardian phone">
          <input name="guardianPhone" defaultValue={initial?.guardianPhone ?? ""} className="input" />
        </Field>
        <Field label="Enrollment date">
          <input name="enrollmentDate" type="date" required defaultValue={initial?.enrollmentDate ?? ""} className="input" />
        </Field>
        <Field label="Status">
          <select name="status" defaultValue={initial?.status ?? "ACTIVE"} className="input">
            {STUDENT_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Address">
        <input name="address" defaultValue={initial?.address ?? ""} className="input" />
      </Field>
      <Field label="Notes">
        <textarea name="notes" rows={2} defaultValue={initial?.notes ?? ""} className="input" />
      </Field>
      <Field label="Medical remarks" hint="Allergies, conditions teachers should know about">
        <textarea name="medicalNotes" rows={2} defaultValue={initial?.medicalNotes ?? ""} className="input" />
      </Field>
      <div className="flex gap-2">
        <button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : isEdit ? "Save changes" : "Create student"}</button>
      </div>
    </form>
  );
}
