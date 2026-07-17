import { describe, expect, it } from "vitest";
import { payrollGenerateSchema, studentCreateSchema, workLogCreateSchema } from "../validation";

// Regression tests for empty <select>/<input> values: "" from a form must become
// undefined, never an empty-string foreign key (caused a 500 on work-log create).

describe("empty form values", () => {
  it("work log with no class: classId '' → undefined", () => {
    const parsed = workLogCreateSchema.parse({
      teacherId: "t1",
      classId: "",
      workDate: "2026-07-17",
      startTime: "10:08",
      endTime: "12:08",
      breakMinutes: "0",
    });
    expect(parsed.classId).toBeUndefined();
    expect(parsed.breakMinutes).toBe(0);
  });

  it("work log with a class keeps the id", () => {
    const parsed = workLogCreateSchema.parse({
      teacherId: "t1",
      classId: "cls_123",
      workDate: "2026-07-17",
      startTime: "10:00",
      endTime: "11:00",
      breakMinutes: 0,
    });
    expect(parsed.classId).toBe("cls_123");
  });

  it("payroll generate for all teachers: teacherId '' → undefined", () => {
    expect(payrollGenerateSchema.parse({ month: "2026-07", teacherId: "" }).teacherId).toBeUndefined();
  });

  it("blank optional text fields → undefined, not empty strings", () => {
    const parsed = studentCreateSchema.parse({
      fullName: "Test",
      contactNumber: "6123",
      enrollmentDate: "2026-07-17",
      email: "",
      notes: "   ",
      guardianName: "",
    });
    expect(parsed.email).toBeUndefined();
    expect(parsed.notes).toBeUndefined();
    expect(parsed.guardianName).toBeUndefined();
  });
});
