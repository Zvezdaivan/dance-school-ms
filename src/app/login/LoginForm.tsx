"use client";

import { ErrorBanner, Field, useJsonSubmit } from "@/components/forms";

export function LoginForm() {
  const { onSubmit, busy, error } = useJsonSubmit({ url: "/api/auth/login", redirectTo: "/dashboard" });
  return (
    <form onSubmit={onSubmit} className="card space-y-4">
      <ErrorBanner error={error} />
      <Field label="Email">
        <input name="email" type="email" required autoFocus className="input" placeholder="you@dance.school" />
      </Field>
      <Field label="Password">
        <input name="password" type="password" required className="input" placeholder="••••••••" />
      </Field>
      <button className="btn btn-primary w-full" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
