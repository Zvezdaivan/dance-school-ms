import { describe, expect, it } from "vitest";
import { formatCents, parseAmountToCents } from "../money";

describe("parseAmountToCents", () => {
  it("parses whole dollars", () => {
    expect(parseAmountToCents("880")).toBe(88000);
    expect(parseAmountToCents(880)).toBe(88000);
  });
  it("parses decimals and thousands separators", () => {
    expect(parseAmountToCents("1,234.5")).toBe(123450);
    expect(parseAmountToCents("0.05")).toBe(5);
  });
  it("rejects more than 2 decimal places and garbage", () => {
    expect(() => parseAmountToCents("1.999")).toThrow();
    expect(() => parseAmountToCents("abc")).toThrow();
    expect(() => parseAmountToCents("")).toThrow();
  });
  it("handles negatives", () => {
    expect(parseAmountToCents("-10.25")).toBe(-1025);
  });
});

describe("formatCents", () => {
  it("formats HKD with grouping", () => {
    expect(formatCents(123450)).toBe("HK$1,234.50");
    expect(formatCents(5)).toBe("HK$0.05");
    expect(formatCents(-88000)).toBe("-HK$880.00");
  });
});
