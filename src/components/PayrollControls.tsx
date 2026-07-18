"use client";

import { ErrorBanner, Field, useJsonSubmit } from "@/components/forms";
import { EnumOptions } from "@/components/ui";
import { ADJUSTMENT_TYPES, PAYMENT_METHODS } from "@/lib/constants";

/** Generate/regenerate draft payroll for a month (all teachers or one). */
export function PayrollGenerateForm({ teachers, defaultMonth }: { teachers: { id: string; fullName: string }[]; defaultMonth: string }) {
  const { onSubmit, busy, error } = useJsonSubmit({ url: "/api/payroll" });
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <ErrorBanner error={error} />
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-40">
          <Field label="Payroll month">
            <input type="month" name="month" required defaultValue={defaultMonth} className="input" />
          </Field>
        </div>
        <div className="w-56">
          <Field label="Teacher">
            <select name="teacherId" defaultValue="" className="input">
              <option value="">All active teachers</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
            </select>
          </Field>
        </div>
        <button className="btn btn-primary" disabled={busy}>{busy ? "Generating…" : "Generate drafts"}</button>
      </div>
      <p className="text-xs text-gray-500">
        Hourly pay = approved hours × rate. Existing drafts are recalculated; approved/paid records are never touched.
      </p>
    </form>
  );
}

/** Mark an approved payroll record as paid (requires date + method). */
export function MarkPaidForm({ payrollId }: { payrollId: string }) {
  const { onSubmit, busy, error } = useJsonSubmit({
    url: `/api/payroll/${payrollId}`,
    method: "PATCH",
    transform: (data) => ({ ...data, status: "PAID" }),
  });
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <ErrorBanner error={error} />
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-40">
          <Field label="Payment date">
            <input type="date" name="paymentDate" required className="input" />
          </Field>
        </div>
        <div className="w-44">
          <Field label="Method">
            <select name="paymentMethod" defaultValue="BANK_TRANSFER" className="input">
              <EnumOptions values={PAYMENT_METHODS.filter((m) => m !== "CREDIT_CARD")} />
            </select>
          </Field>
        </div>
        <button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : "Mark as paid"}</button>
      </div>
    </form>
  );
}

/** Add an allowance / bonus / deduction line to a draft payroll record. */
export function AdjustmentForm({ payrollId }: { payrollId: string }) {
  const { onSubmit, busy, error, fieldErrors } = useJsonSubmit({ url: `/api/payroll/${payrollId}/adjustments` });
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <ErrorBanner error={error} fieldErrors={fieldErrors} />
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-36">
          <Field label="Type">
            <select name="type" defaultValue="ALLOWANCE" className="input">
              <EnumOptions values={ADJUSTMENT_TYPES} />
            </select>
          </Field>
        </div>
        <div className="w-32">
          <Field label="Amount (HK$)">
            <input name="amount" required inputMode="decimal" placeholder="500" className="input" />
          </Field>
        </div>
        <div className="min-w-48 flex-1">
          <Field label="Reason">
            <input name="reason" required placeholder="e.g. transport allowance" className="input" />
          </Field>
        </div>
        <button className="btn" disabled={busy}>{busy ? "Adding…" : "Add"}</button>
      </div>
    </form>
  );
}
