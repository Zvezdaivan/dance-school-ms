"use client";

import { ErrorBanner, Field, useJsonSubmit } from "@/components/forms";
import { EnumOptions } from "@/components/ui";
import { CLASS_LEVELS, CLASS_STATUSES, DAYS_OF_WEEK, FEE_TYPES } from "@/lib/constants";

export interface ClassFormValues {
  id?: string;
  name?: string;
  style?: string;
  level?: string;
  teacherId?: string;
  dayOfWeek?: string;
  startTime?: string | null;
  endTime?: string | null;
  scheduleNotes?: string | null;
  capacity?: string;
  fee?: string;
  feeType?: string;
  status?: string;
}

export function ClassForm({
  initial,
  teachers,
}: {
  initial?: ClassFormValues;
  teachers: { id: string; fullName: string }[];
}) {
  const isEdit = Boolean(initial?.id);
  const { onSubmit, busy, error, fieldErrors } = useJsonSubmit({
    url: isEdit ? `/api/classes/${initial!.id}` : "/api/classes",
    method: isEdit ? "PATCH" : "POST",
    redirectTo: isEdit ? `/classes/${initial!.id}` : (res) => `/classes/${(res as { id: string }).id}`,
  });

  return (
    <form onSubmit={onSubmit} className="card max-w-3xl space-y-4">
      <ErrorBanner error={error} fieldErrors={fieldErrors} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Class name">
          <input name="name" required defaultValue={initial?.name ?? ""} className="input" />
        </Field>
        <Field label="Dance style">
          <input name="style" required placeholder="Ballet, Hip Hop, Jazz…" defaultValue={initial?.style ?? ""} className="input" />
        </Field>
        <Field label="Level">
          <select name="level" defaultValue={initial?.level ?? "BEGINNER"} className="input">
            <EnumOptions values={CLASS_LEVELS} />
          </select>
        </Field>
        <Field label="Teacher">
          <select name="teacherId" required defaultValue={initial?.teacherId ?? ""} className="input">
            <option value="" disabled>Select a teacher…</option>
            {teachers.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
          </select>
        </Field>
        <Field label="Day of week">
          <select name="dayOfWeek" defaultValue={initial?.dayOfWeek ?? ""} className="input">
            <option value="">Not fixed</option>
            {DAYS_OF_WEEK.map((d, i) => <option key={d} value={i}>{d}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start time">
            <input name="startTime" type="time" defaultValue={initial?.startTime ?? ""} className="input" />
          </Field>
          <Field label="End time">
            <input name="endTime" type="time" defaultValue={initial?.endTime ?? ""} className="input" />
          </Field>
        </div>
        <Field label="Capacity">
          <input name="capacity" type="number" min={1} required defaultValue={initial?.capacity ?? "12"} className="input" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fee (HK$)">
            <input name="fee" required inputMode="decimal" placeholder="880" defaultValue={initial?.fee ?? ""} className="input" />
          </Field>
          <Field label="Fee type">
            <select name="feeType" defaultValue={initial?.feeType ?? "MONTHLY"} className="input">
              <EnumOptions values={FEE_TYPES} />
            </select>
          </Field>
        </div>
        <Field label="Status">
          <select name="status" defaultValue={initial?.status ?? "ACTIVE"} className="input">
            <EnumOptions values={CLASS_STATUSES} />
          </select>
        </Field>
      </div>
      <Field label="Schedule notes">
        <input name="scheduleNotes" defaultValue={initial?.scheduleNotes ?? ""} className="input" />
      </Field>
      <button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : isEdit ? "Save changes" : "Create class"}</button>
    </form>
  );
}
