// Date helpers. Calendar dates (birthdays, work dates, payment dates) are
// stored as UTC midnight so they render identically in any timezone.

export function parseDateInput(value: string): Date {
  // "YYYY-MM-DD" → UTC midnight
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`Invalid date: ${value}`);
  const d = new Date(`${value}T00:00:00.000Z`);
  if (isNaN(d.getTime())) throw new Error(`Invalid date: ${value}`);
  return d;
}

export function toDateInput(date: Date | null | undefined): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export function fmtDate(date: Date | null | undefined): string {
  if (!date) return "—";
  return date.toISOString().slice(0, 10);
}

export function fmtDateTime(date: Date | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleString("en-HK", { dateStyle: "medium", timeStyle: "short", hour12: false });
}

/** "2026-07" for a given date (UTC). */
export function monthOf(date: Date): string {
  return date.toISOString().slice(0, 7);
}

export function currentMonth(): string {
  return monthOf(new Date());
}

/** Month string → [start, end) UTC range. */
export function monthRange(month: string): { start: Date; end: Date } {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error(`Invalid month: ${month}`);
  const [y, m] = month.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  return { start, end };
}

/** "HH:mm" → minutes since midnight. */
export function timeToMinutes(time: string): number {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error(`Invalid time: ${time}`);
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToHoursLabel(minutes: number): string {
  return (minutes / 60).toFixed(2);
}
