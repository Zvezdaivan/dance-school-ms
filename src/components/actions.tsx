"use client";

// Small action button that calls an API endpoint (PATCH/POST/DELETE),
// with optional confirmation, then refreshes the current page.

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ActionButton({
  label,
  url,
  method = "POST",
  body,
  confirmText,
  redirectTo,
  variant = "default",
}: {
  label: string;
  url: string;
  method?: "POST" | "PATCH" | "DELETE";
  body?: Record<string, unknown>;
  confirmText?: string;
  redirectTo?: string;
  variant?: "default" | "primary" | "danger";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        window.alert(data.error ?? `Action failed (${res.status})`);
        return;
      }
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch {
      window.alert("Network error — please try again");
    } finally {
      setBusy(false);
    }
  }

  const cls =
    variant === "primary" ? "btn btn-sm btn-primary" : variant === "danger" ? "btn btn-sm btn-danger" : "btn btn-sm";
  return (
    <button className={cls} onClick={run} disabled={busy}>
      {busy ? "…" : label}
    </button>
  );
}
