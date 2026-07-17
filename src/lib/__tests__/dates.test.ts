import { describe, expect, it } from "vitest";
import { monthRange, parseDateInput, timeToMinutes } from "../dates";

describe("parseDateInput", () => {
  it("parses to UTC midnight", () => {
    expect(parseDateInput("2026-07-14").toISOString()).toBe("2026-07-14T00:00:00.000Z");
  });
  it("rejects bad input", () => {
    expect(() => parseDateInput("14/07/2026")).toThrow();
    expect(() => parseDateInput("2026-13-99")).toThrow();
  });
});

describe("monthRange", () => {
  it("returns [start, end) covering the month", () => {
    const { start, end } = monthRange("2026-02");
    expect(start.toISOString()).toBe("2026-02-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-03-01T00:00:00.000Z");
  });
  it("rejects invalid months", () => {
    expect(() => monthRange("2026-13")).toThrow();
  });
});

describe("timeToMinutes", () => {
  it("converts HH:mm", () => {
    expect(timeToMinutes("00:00")).toBe(0);
    expect(timeToMinutes("19:30")).toBe(1170);
  });
  it("rejects invalid times", () => {
    expect(() => timeToMinutes("24:00")).toThrow();
    expect(() => timeToMinutes("9:00")).toThrow();
  });
});
