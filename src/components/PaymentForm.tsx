"use client";

import { ErrorBanner, Field, useJsonSubmit } from "@/components/forms";
import { EnumOptions } from "@/components/ui";
import { PAYMENT_METHODS, PAYMENT_STATUSES, PAYMENT_TYPES } from "@/lib/constants";

export function PaymentForm({
  students,
  defaultStudentId,
  defaultDate,
}: {
  students: { id: string; fullName: string; contactNumber: string }[];
  defaultStudentId?: string;
  defaultDate: string;
}) {
  const { onSubmit, busy, error, fieldErrors } = useJsonSubmit({
    url: "/api/payments",
    redirectTo: "/payments",
  });

  return (
    <form onSubmit={onSubmit} className="card max-w-2xl space-y-4">
      <ErrorBanner error={error} fieldErrors={fieldErrors} />
      <Field label="Student">
        <select name="studentId" required defaultValue={defaultStudentId ?? ""} className="input">
          <option value="" disabled>Select a student…</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>{s.fullName} ({s.contactNumber})</option>
          ))}
        </select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Payment type">
          <select name="paymentType" defaultValue="MONTHLY_TUITION" className="input">
            <EnumOptions values={PAYMENT_TYPES} />
          </select>
        </Field>
        <Field label="Amount (HK$)">
          <input name="amount" required inputMode="decimal" placeholder="880.00" className="input" />
        </Field>
        <Field label="Payment date">
          <input name="paymentDate" type="date" required defaultValue={defaultDate} className="input" />
        </Field>
        <Field label="Method">
          <select name="method" defaultValue="FPS" className="input">
            <EnumOptions values={PAYMENT_METHODS} />
          </select>
        </Field>
        <Field label="Status" hint="Use Pending to record an expected payment (tracked as outstanding)">
          <select name="status" defaultValue="PAID" className="input">
            <EnumOptions values={PAYMENT_STATUSES} />
          </select>
        </Field>
        <Field label="Tuition period" hint="For monthly tuition, e.g. 2026-07">
          <input name="periodMonth" placeholder="YYYY-MM" className="input" />
        </Field>
      </div>
      <Field label="Receipt / reference number" hint="Leave blank to auto-generate">
        <input name="receiptNumber" className="input" />
      </Field>
      <Field label="Notes">
        <textarea name="notes" rows={2} className="input" />
      </Field>
      <button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : "Record payment"}</button>
    </form>
  );
}
