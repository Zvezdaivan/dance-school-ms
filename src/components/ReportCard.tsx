"use client";

// Downloads a report via fetch → blob so failures (expired session, server
// error) show an inline message instead of navigating the tab to raw JSON.

import { useState } from "react";

export function ReportCard({
  type,
  title,
  description,
  dateRange,
}: {
  type: string;
  title: string;
  description: string;
  dateRange: boolean;
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/reports/${type}?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          res.status === 401
            ? "Your session has expired — please sign in again."
            : (data.error ?? `Export failed (HTTP ${res.status})`)
        );
        return;
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") ?? "";
      const filename = /filename="([^"]+)"/.exec(cd)?.[1] ?? `${type}-report.xlsx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setDone(`Saved as ${filename} — check your Downloads folder.`);
    } catch {
      setError("Could not reach the server — is the app still running?");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card flex flex-col">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      <p className="mt-1 flex-1 text-xs text-gray-500">{description}</p>
      {dateRange && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <label className="label">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input" />
          </div>
        </div>
      )}
      {error && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      {done && <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{done}</p>}
      <button onClick={download} disabled={busy} className="btn btn-primary mt-4">
        {busy ? "Preparing…" : "Download Excel"}
      </button>
    </div>
  );
}
