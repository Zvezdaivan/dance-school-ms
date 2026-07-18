"use client";

import { useState } from "react";
import { ErrorBanner, Field, useJsonSubmit } from "@/components/forms";
import { EnumOptions } from "@/components/ui";
import { ROLES } from "@/lib/constants";

export function UserForm({ teachers }: { teachers: { id: string; fullName: string }[] }) {
  const [role, setRole] = useState("STAFF");
  const { onSubmit, busy, error, fieldErrors } = useJsonSubmit({ url: "/api/users" });
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <ErrorBanner error={error} fieldErrors={fieldErrors} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Name">
          <input name="name" required className="input" />
        </Field>
        <Field label="Email">
          <input name="email" type="email" required className="input" />
        </Field>
        <Field label="Password">
          <input name="password" type="password" required minLength={8} className="input" />
        </Field>
        <Field label="Role">
          <select name="role" value={role} onChange={(e) => setRole(e.target.value)} className="input">
            <EnumOptions values={ROLES} />
          </select>
        </Field>
        {role === "TEACHER" && (
          <Field label="Teacher record">
            <select name="teacherId" required defaultValue="" className="input">
              <option value="" disabled>Link to…</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
            </select>
          </Field>
        )}
      </div>
      <button className="btn btn-primary" disabled={busy}>{busy ? "Creating…" : "Create user"}</button>
    </form>
  );
}
