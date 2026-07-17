import { describe, expect, it } from "vitest";
import { computeBasePayCents, computePayableMinutes, computePayrollTotals } from "../payroll-calc";

describe("computePayableMinutes", () => {
  it("computes end - start - break", () => {
    expect(computePayableMinutes("10:00", "13:30", 30)).toBe(180);
    expect(computePayableMinutes("19:00", "20:15", 0)).toBe(75);
  });
  it("rejects invalid ranges", () => {
    expect(() => computePayableMinutes("20:00", "19:00", 0)).toThrow("End time must be after start time");
    expect(() => computePayableMinutes("10:00", "10:30", 30)).toThrow("Break exceeds");
    expect(() => computePayableMinutes("10:00", "11:00", -5)).toThrow("Break cannot be negative");
  });
});

describe("computeBasePayCents", () => {
  it("pays hourly teachers rate x hours, rounded to the cent", () => {
    // HK$350/h x 10.5h = HK$3,675.00
    expect(
      computeBasePayCents({ employmentType: "HOURLY", hourlyRateCents: 35000, monthlySalaryCents: null, totalMinutes: 630 })
    ).toBe(367500);
    // rounding: HK$300/h x 100 minutes = HK$500.00
    expect(
      computeBasePayCents({ employmentType: "CONTRACTOR", hourlyRateCents: 30000, monthlySalaryCents: null, totalMinutes: 100 })
    ).toBe(50000);
  });
  it("pays monthly teachers the fixed salary regardless of minutes", () => {
    expect(
      computeBasePayCents({ employmentType: "MONTHLY", hourlyRateCents: null, monthlySalaryCents: 2200000, totalMinutes: 0 })
    ).toBe(2200000);
  });
  it("rejects missing rates", () => {
    expect(() =>
      computeBasePayCents({ employmentType: "HOURLY", hourlyRateCents: null, monthlySalaryCents: null, totalMinutes: 60 })
    ).toThrow();
    expect(() =>
      computeBasePayCents({ employmentType: "MONTHLY", hourlyRateCents: null, monthlySalaryCents: null, totalMinutes: 0 })
    ).toThrow();
  });
});

describe("computePayrollTotals", () => {
  it("aggregates adjustments into gross and net", () => {
    const totals = computePayrollTotals(100000, [
      { type: "ALLOWANCE", amountCents: 20000 },
      { type: "BONUS", amountCents: 50000 },
      { type: "DEDUCTION", amountCents: 15000 },
      { type: "ALLOWANCE", amountCents: 5000 },
    ]);
    expect(totals).toEqual({
      allowanceCents: 25000,
      bonusCents: 50000,
      deductionCents: 15000,
      grossPayCents: 175000,
      netPayCents: 160000,
    });
  });
  it("handles no adjustments", () => {
    expect(computePayrollTotals(220000, [])).toEqual({
      allowanceCents: 0,
      bonusCents: 0,
      deductionCents: 0,
      grossPayCents: 220000,
      netPayCents: 220000,
    });
  });
  it("rejects negative amounts and unknown types", () => {
    expect(() => computePayrollTotals(0, [{ type: "BONUS", amountCents: -1 }])).toThrow();
    expect(() => computePayrollTotals(0, [{ type: "TIP", amountCents: 100 }])).toThrow();
  });
});
