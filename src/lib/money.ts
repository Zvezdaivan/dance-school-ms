// All monetary amounts are stored as integer cents (HKD).

import { DomainError } from "./api-error";

/** Format cents as "HK$1,234.50". */
export function formatCents(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "—";
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const rem = abs % 100;
  return `${sign}HK$${dollars.toLocaleString("en-US")}.${rem.toString().padStart(2, "0")}`;
}

/** Cents → decimal dollars, for Excel numeric cells. */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

/**
 * Parse a user-entered dollar amount ("1,234.5", "80") into integer cents.
 * Throws on invalid input or more than 2 decimal places.
 */
export function parseAmountToCents(input: string | number): number {
  const raw = String(input).replace(/,/g, "").trim();
  if (!/^-?\d+(\.\d{1,2})?$/.test(raw)) {
    throw new DomainError(`Invalid amount: "${input}"`);
  }
  const negative = raw.startsWith("-");
  const [wholePart, fracPart = ""] = raw.replace("-", "").split(".");
  const cents = parseInt(wholePart, 10) * 100 + parseInt(fracPart.padEnd(2, "0") || "0", 10);
  return negative ? -cents : cents;
}
