// Pure payroll/work-hours business logic — no database access, unit-testable.

import { timeToMinutes } from "./dates";

/**
 * Payable minutes for a work log: (end - start) - break.
 * Throws if the result is not positive (overnight shifts are not supported;
 * split them into two logs).
 */
export function computePayableMinutes(startTime: string, endTime: string, breakMinutes: number): number {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (end <= start) throw new Error("End time must be after start time");
  if (breakMinutes < 0) throw new Error("Break cannot be negative");
  const payable = end - start - breakMinutes;
  if (payable <= 0) throw new Error("Break exceeds the working period");
  return payable;
}

export interface BasePayInput {
  employmentType: string; // HOURLY | MONTHLY | CONTRACTOR
  hourlyRateCents: number | null;
  monthlySalaryCents: number | null;
  totalMinutes: number; // approved payable minutes in the payroll month
}

/**
 * Base pay for a payroll month.
 * - HOURLY / CONTRACTOR: hourly rate x approved hours, rounded to the nearest cent.
 * - MONTHLY: fixed monthly salary regardless of logged minutes.
 */
export function computeBasePayCents(input: BasePayInput): number {
  if (input.employmentType === "MONTHLY") {
    if (input.monthlySalaryCents == null) throw new Error("Monthly-salaried teacher has no salary set");
    return input.monthlySalaryCents;
  }
  if (input.hourlyRateCents == null) throw new Error("Hourly teacher has no hourly rate set");
  return Math.round((input.hourlyRateCents * input.totalMinutes) / 60);
}

export interface AdjustmentLine {
  type: string; // ALLOWANCE | BONUS | DEDUCTION
  amountCents: number; // always positive; type determines direction
}

export interface PayrollTotals {
  allowanceCents: number;
  bonusCents: number;
  deductionCents: number;
  grossPayCents: number;
  netPayCents: number;
}

/** Gross = base + allowances + bonuses. Net = gross - deductions. */
export function computePayrollTotals(basePayCents: number, adjustments: AdjustmentLine[]): PayrollTotals {
  let allowance = 0,
    bonus = 0,
    deduction = 0;
  for (const adj of adjustments) {
    if (adj.amountCents < 0) throw new Error("Adjustment amounts must be positive");
    if (adj.type === "ALLOWANCE") allowance += adj.amountCents;
    else if (adj.type === "BONUS") bonus += adj.amountCents;
    else if (adj.type === "DEDUCTION") deduction += adj.amountCents;
    else throw new Error(`Unknown adjustment type: ${adj.type}`);
  }
  const gross = basePayCents + allowance + bonus;
  return {
    allowanceCents: allowance,
    bonusCents: bonus,
    deductionCents: deduction,
    grossPayCents: gross,
    netPayCents: gross - deduction,
  };
}
