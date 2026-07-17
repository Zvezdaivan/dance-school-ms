"use client";

import { useState } from "react";
import { ErrorBanner, Field, useJsonSubmit } from "@/components/forms";
import { EMPLOYMENT_TYPES, TEACHER_STATUSES, label } from "@/lib/constants";

export interface TeacherFormValues {
  id?: string;
  fullName?: string;
  contactNumber?: string;
  email?: string | null;
  employmentType?: string;
  hourlyRate?: string;
  monthlySalary?: string;
  bankName?: string | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  startDate?: string;
  status?: string;
  notes?: string | null;
}

export function TeacherForm({ initial }: { initial?: TeacherFormValues }) {
  const isEdit = Boolean(initial?.id);
  const [employmentType, setEmploymentType] = useState(initial?.employmentType ?? "HOURLY");
  const { onSubmit, busy, error, fieldErrors } = useJsonSubmit({
    url: isEdit ? `/api/teachers/${initial!.id}` : "/api/teachers",
    method: isEdit ? "PATCH" : "POST",
    redirectTo: isEdit ? `/teachers/${initial!.id}` : (res) => `/teachers/${(res as { id: string }).id}`,
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
        <Field label="Start date">
          <input name="startDate" type="date" required defaultValue={initial?.startDate ?? ""} className="input" />
        </Field>
        <Field label="Employment type">
          <select
            name="employmentType"
            value={employmentType}
            onChange={(e) => setEmploymentType(e.target.value)}
            className="input"
          >
            {EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{label(t)}</option>)}
          </select>
        </Field>
        {employmentType === "MONTHLY" ? (
          <Field label="Monthly salary (HK$)">
            <input name="monthlySalary" required inputMode="decimal" placeholder="22000" defaultValue={initial?.monthlySalary ?? ""} className="input" />
          </Field>
        ) : (
          <Field label="Hourly rate (HK$)">
            <input name="hourlyRate" required inputMode="decimal" placeholder="350" defaultValue={initial?.hourlyRate ?? ""} className="input" />
          </Field>
        )}
        <Field label="Status">
          <select name="status" defaultValue={initial?.status ?? "ACTIVE"} className="input">
            {TEACHER_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Bank">
          <input name="bankName" defaultValue={initial?.bankName ?? ""} className="input" />
        </Field>
        <Field label="Account name">
          <input name="bankAccountName" defaultValue={initial?.bankAccountName ?? ""} className="input" />
        </Field>
        <Field label="Account number">
          <input name="bankAccountNumber" defaultValue={initial?.bankAccountNumber ?? ""} className="input" />
        </Field>
      </div>
      <Field label="Notes">
        <textarea name="notes" rows={2} defaultValue={initial?.notes ?? ""} className="input" />
      </Field>
      <button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : isEdit ? "Save changes" : "Create teacher"}</button>
    </form>
  );
}
