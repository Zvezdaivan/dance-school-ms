"use client";

import { ErrorBanner, Field, useJsonSubmit } from "@/components/forms";

export interface WorkLogFormValues {
  id?: string;
  teacherId?: string;
  classId?: string | null;
  workDate?: string;
  startTime?: string;
  endTime?: string;
  breakMinutes?: string;
  remarks?: string | null;
  adjustedMinutes?: string;
  adjustmentReason?: string | null;
}

export function WorkLogForm({
  initial,
  teachers,
  classes,
  lockTeacher,
  canAdjust,
}: {
  initial?: WorkLogFormValues;
  teachers: { id: string; fullName: string }[];
  classes: { id: string; name: string }[];
  lockTeacher?: string; // teacher role: fixed to own teacherId
  canAdjust?: boolean; // managers can override payable minutes
}) {
  const isEdit = Boolean(initial?.id);
  const { onSubmit, busy, error, fieldErrors } = useJsonSubmit({
    url: isEdit ? `/api/work-logs/${initial!.id}` : "/api/work-logs",
    method: isEdit ? "PATCH" : "POST",
    redirectTo: "/work-logs",
  });

  return (
    <form onSubmit={onSubmit} className="card max-w-2xl space-y-4">
      <ErrorBanner error={error} fieldErrors={fieldErrors} />
      {!isEdit && (
        <Field label="Teacher">
          {lockTeacher ? (
            <input type="hidden" name="teacherId" value={lockTeacher} />
          ) : (
            <select name="teacherId" required defaultValue={initial?.teacherId ?? ""} className="input">
              <option value="" disabled>Select a teacher…</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
            </select>
          )}
          {lockTeacher && <p className="text-sm text-gray-600">Hours are logged under your own teacher profile.</p>}
        </Field>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Work date">
          <input name="workDate" type="date" required defaultValue={initial?.workDate ?? ""} className="input" />
        </Field>
        <Field label="Class / session" hint="Optional">
          <select name="classId" defaultValue={initial?.classId ?? ""} className="input">
            <option value="">Not linked to a class</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start time">
            <input name="startTime" type="time" required defaultValue={initial?.startTime ?? ""} className="input" />
          </Field>
          <Field label="End time">
            <input name="endTime" type="time" required defaultValue={initial?.endTime ?? ""} className="input" />
          </Field>
        </div>
        <Field label="Break (minutes)">
          <input name="breakMinutes" type="number" min={0} defaultValue={initial?.breakMinutes ?? "0"} className="input" />
        </Field>
      </div>
      <Field label="Remarks">
        <textarea name="remarks" rows={2} defaultValue={initial?.remarks ?? ""} className="input" />
      </Field>
      {canAdjust && isEdit && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="mb-3 text-xs font-semibold text-amber-800 uppercase">Manual adjustment (manager only)</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Adjusted payable minutes" hint="Overrides the computed value">
              <input name="adjustedMinutes" type="number" min={1} defaultValue={initial?.adjustedMinutes ?? ""} className="input" />
            </Field>
            <Field label="Adjustment reason" hint="Required when adjusting">
              <input name="adjustmentReason" defaultValue={initial?.adjustmentReason ?? ""} className="input" />
            </Field>
          </div>
        </div>
      )}
      {isEdit && <p className="text-xs text-gray-500">Saving an edit resets the record to Pending for re-approval.</p>}
      <button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : isEdit ? "Save changes" : "Log hours"}</button>
    </form>
  );
}
