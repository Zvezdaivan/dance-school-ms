"use client";

// Interactive attendance sheet: pick class + date, load the roster,
// set each student's status, save in one request.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ATTENDANCE_STATUSES, label } from "@/lib/constants";

interface SheetStudent {
  studentId: string;
  fullName: string;
  existingStatus: string | null;
  existingNotes: string | null;
}

interface Sheet {
  class: { id: string; name: string; style: string; teacherName: string };
  students: SheetStudent[];
}

const STATUS_STYLES: Record<string, string> = {
  PRESENT: "peer-checked:bg-emerald-600 peer-checked:text-white peer-checked:border-emerald-600",
  ABSENT: "peer-checked:bg-red-600 peer-checked:text-white peer-checked:border-red-600",
  LATE: "peer-checked:bg-amber-500 peer-checked:text-white peer-checked:border-amber-500",
  EXCUSED: "peer-checked:bg-sky-600 peer-checked:text-white peer-checked:border-sky-600",
};

export function AttendanceSheet({
  classes,
  initialClassId,
  initialDate,
}: {
  classes: { id: string; name: string; style: string }[];
  initialClassId?: string;
  initialDate: string;
}) {
  const router = useRouter();
  const [classId, setClassId] = useState(initialClassId ?? "");
  const [sessionDate, setSessionDate] = useState(initialDate);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    if (!classId || !sessionDate) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/attendance?classId=${classId}&sessionDate=${sessionDate}`);
      const data = await res.json();
      if (!res.ok) {
        setMessage({ kind: "error", text: data.error ?? "Failed to load roster" });
        setSheet(null);
        return;
      }
      setSheet(data);
      const init: Record<string, string> = {};
      for (const s of data.students as SheetStudent[]) init[s.studentId] = s.existingStatus ?? "PRESENT";
      setStatuses(init);
    } finally {
      setLoading(false);
    }
  }, [classId, sessionDate]);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    if (!sheet) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId,
          sessionDate,
          records: sheet.students.map((s) => ({ studentId: s.studentId, status: statuses[s.studentId] ?? "PRESENT" })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ kind: "error", text: data.error ?? "Failed to save attendance" });
        return;
      }
      setMessage({ kind: "ok", text: `Attendance saved for ${sheet.students.length} student(s).` });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-end gap-3">
        <div className="min-w-64 flex-1">
          <label className="label">Class</label>
          <select value={classId} onChange={(e) => setClassId(e.target.value)} className="input">
            <option value="">Select a class…</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.style})</option>)}
          </select>
        </div>
        <div className="w-44">
          <label className="label">Session date</label>
          <input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} className="input" />
        </div>
      </div>

      {message && (
        <div
          className={`rounded-lg border px-4 py-2.5 text-sm ${
            message.kind === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {loading && <p className="text-sm text-gray-500">Loading roster…</p>}

      {!loading && sheet && (
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">
              {sheet.class.name} — {sessionDate} <span className="font-normal text-gray-500">· {sheet.class.teacherName}</span>
            </h2>
            <button onClick={save} className="btn btn-primary" disabled={saving || sheet.students.length === 0}>
              {saving ? "Saving…" : "Save attendance"}
            </button>
          </div>
          {sheet.students.length === 0 ? (
            <p className="text-sm text-gray-500">No active students enrolled in this class.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {sheet.students.map((s) => (
                <li key={s.studentId} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                  <span className="text-sm font-medium text-gray-900">{s.fullName}</span>
                  <div className="flex gap-1.5">
                    {ATTENDANCE_STATUSES.map((status) => (
                      <label key={status} className="cursor-pointer">
                        <input
                          type="radio"
                          name={`status-${s.studentId}`}
                          className="peer sr-only"
                          checked={(statuses[s.studentId] ?? "PRESENT") === status}
                          onChange={() => setStatuses((prev) => ({ ...prev, [s.studentId]: status }))}
                        />
                        <span
                          className={`inline-block rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors ${STATUS_STYLES[status]}`}
                        >
                          {label(status)}
                        </span>
                      </label>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
