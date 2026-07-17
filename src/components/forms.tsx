"use client";

// Client-side form utilities: JSON submission with server-side validation
// errors surfaced inline.

import { useRouter } from "next/navigation";
import { FormEvent, ReactNode, useState } from "react";

export interface FieldError {
  field: string;
  message: string;
}

export function useJsonSubmit(options: {
  url: string | ((data: Record<string, string>) => string);
  method?: string;
  redirectTo?: string | ((response: unknown) => string);
  transform?: (data: Record<string, string>) => unknown;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldError[]>([]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFieldErrors([]);
    const data = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
    try {
      const url = typeof options.url === "function" ? options.url(data) : options.url;
      const res = await fetch(url, {
        method: options.method ?? "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options.transform ? options.transform(data) : data),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? `Request failed (${res.status})`);
        setFieldErrors(body.details ?? []);
        return;
      }
      if (options.redirectTo) {
        const target = typeof options.redirectTo === "function" ? options.redirectTo(body) : options.redirectTo;
        router.push(target);
      }
      router.refresh();
    } catch {
      setError("Network error — please try again");
    } finally {
      setBusy(false);
    }
  }

  return { onSubmit, busy, error, fieldErrors };
}

export function ErrorBanner({ error, fieldErrors }: { error: string | null; fieldErrors?: FieldError[] }) {
  if (!error) return null;
  return (
    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <p className="font-medium">{error}</p>
      {fieldErrors && fieldErrors.length > 0 && (
        <ul className="mt-1 list-inside list-disc">
          {fieldErrors.map((fe, i) => (
            <li key={i}>
              {fe.field ? `${fe.field}: ` : ""}
              {fe.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
