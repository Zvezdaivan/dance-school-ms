// zod schemas for every API input. These are the request-boundary guard;
// services can assume validated data.

import { z } from "zod";
import {
  ADJUSTMENT_TYPES,
  ATTENDANCE_STATUSES,
  CLASS_LEVELS,
  CLASS_STATUSES,
  EMPLOYMENT_TYPES,
  ENROLLMENT_STATUSES,
  FEE_TYPES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  PAYMENT_TYPES,
  PAYROLL_STATUSES,
  ROLES,
  STUDENT_STATUSES,
  TEACHER_STATUSES,
  USER_STATUSES,
} from "./constants";
import { parseAmountToCents } from "./money";

// --- shared primitives -------------------------------------------------------

export const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format");
export const timeStr = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm format (24h)");
export const monthStr = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use YYYY-MM format");

/** Dollar amount as entered by the user ("1,200" or "80.5") → integer cents. */
export const amountCents = z
  .union([z.string(), z.number()])
  .transform((v, ctx) => {
    try {
      return parseAmountToCents(v);
    } catch {
      ctx.addIssue({ code: "custom", message: "Enter a valid amount (max 2 decimal places)" });
      return z.NEVER;
    }
  })
  .pipe(z.number().int());

const positiveAmountCents = amountCents.pipe(z.number().int().positive("Amount must be greater than zero"));

/** Blank/whitespace form values become undefined BEFORE validation runs. */
const blankToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

const optionalTrimmed = z.preprocess(
  blankToUndefined,
  z.string().transform((s) => s.trim()).pipe(z.string().max(2000)).optional()
);

/**
 * Optional foreign-key id from a <select> — "" (e.g. "Not linked to a class")
 * must become undefined, never an empty-string id that violates FK constraints.
 */
const optionalId = z.preprocess(blankToUndefined, z.string().min(1).optional());

// --- auth --------------------------------------------------------------------

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email")),
  password: z.string().min(1, "Password is required"),
});

// --- students ----------------------------------------------------------------

export const studentCreateSchema = z.object({
  fullName: z.string().trim().min(1, "Name is required").max(200),
  contactNumber: z.string().trim().min(1, "Contact number is required").max(50),
  email: z.string().trim().toLowerCase().pipe(z.email()).optional().or(z.literal("").transform(() => undefined)),
  dateOfBirth: dateStr.optional().or(z.literal("").transform(() => undefined)),
  guardianName: optionalTrimmed,
  guardianPhone: optionalTrimmed,
  address: optionalTrimmed,
  enrollmentDate: dateStr,
  status: z.enum(STUDENT_STATUSES).default("ACTIVE"),
  notes: optionalTrimmed,
  medicalNotes: optionalTrimmed,
});
export const studentUpdateSchema = studentCreateSchema.partial();

// --- teachers ----------------------------------------------------------------

export const teacherCreateSchema = z
  .object({
    fullName: z.string().trim().min(1, "Name is required").max(200),
    contactNumber: z.string().trim().min(1, "Contact number is required").max(50),
    email: z.string().trim().toLowerCase().pipe(z.email()).optional().or(z.literal("").transform(() => undefined)),
    employmentType: z.enum(EMPLOYMENT_TYPES),
    hourlyRate: positiveAmountCents.optional().or(z.literal("").transform(() => undefined)),
    monthlySalary: positiveAmountCents.optional().or(z.literal("").transform(() => undefined)),
    bankName: optionalTrimmed,
    bankAccountName: optionalTrimmed,
    bankAccountNumber: optionalTrimmed,
    startDate: dateStr,
    status: z.enum(TEACHER_STATUSES).default("ACTIVE"),
    notes: optionalTrimmed,
  })
  .refine((t) => t.employmentType !== "MONTHLY" || t.monthlySalary !== undefined, {
    message: "Monthly-salaried teachers need a monthly salary",
    path: ["monthlySalary"],
  })
  .refine((t) => t.employmentType === "MONTHLY" || t.hourlyRate !== undefined, {
    message: "Hourly/contractor teachers need an hourly rate",
    path: ["hourlyRate"],
  });
export const teacherUpdateSchema = z.object({
  fullName: z.string().trim().min(1).max(200).optional(),
  contactNumber: z.string().trim().min(1).max(50).optional(),
  email: z.string().trim().toLowerCase().pipe(z.email()).optional().or(z.literal("").transform(() => undefined)),
  employmentType: z.enum(EMPLOYMENT_TYPES).optional(),
  hourlyRate: positiveAmountCents.optional().or(z.literal("").transform(() => undefined)),
  monthlySalary: positiveAmountCents.optional().or(z.literal("").transform(() => undefined)),
  bankName: optionalTrimmed,
  bankAccountName: optionalTrimmed,
  bankAccountNumber: optionalTrimmed,
  startDate: dateStr.optional(),
  status: z.enum(TEACHER_STATUSES).optional(),
  notes: optionalTrimmed,
});

// --- classes & enrollment ------------------------------------------------------

export const classCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  style: z.string().trim().min(1, "Style is required").max(100),
  level: z.enum(CLASS_LEVELS),
  teacherId: z.string().min(1, "Teacher is required"),
  dayOfWeek: z.coerce.number().int().min(0).max(6).optional().or(z.literal("").transform(() => undefined)),
  startTime: timeStr.optional().or(z.literal("").transform(() => undefined)),
  endTime: timeStr.optional().or(z.literal("").transform(() => undefined)),
  scheduleNotes: optionalTrimmed,
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1").max(500),
  fee: positiveAmountCents,
  feeType: z.enum(FEE_TYPES),
  status: z.enum(CLASS_STATUSES).default("ACTIVE"),
});
export const classUpdateSchema = classCreateSchema.partial();

export const enrollmentCreateSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  classId: z.string().min(1, "Class is required"),
  enrolledAt: dateStr,
  notes: optionalTrimmed,
});
export const enrollmentUpdateSchema = z.object({
  status: z.enum(ENROLLMENT_STATUSES),
  droppedAt: dateStr.optional().or(z.literal("").transform(() => undefined)),
  notes: optionalTrimmed,
});

// --- payments ----------------------------------------------------------------

export const paymentCreateSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  paymentType: z.enum(PAYMENT_TYPES),
  amount: positiveAmountCents,
  paymentDate: dateStr,
  method: z.enum(PAYMENT_METHODS),
  status: z.enum(PAYMENT_STATUSES).default("PAID"),
  receiptNumber: optionalTrimmed, // auto-generated when blank
  periodMonth: monthStr.optional().or(z.literal("").transform(() => undefined)),
  notes: optionalTrimmed,
});
export const paymentUpdateSchema = z.object({
  paymentType: z.enum(PAYMENT_TYPES).optional(),
  amount: positiveAmountCents.optional(),
  paymentDate: dateStr.optional(),
  method: z.enum(PAYMENT_METHODS).optional(),
  status: z.enum(PAYMENT_STATUSES).optional(),
  periodMonth: monthStr.optional().or(z.literal("").transform(() => undefined)),
  notes: optionalTrimmed,
});

// --- attendance ----------------------------------------------------------------

export const attendanceBulkSchema = z.object({
  classId: z.string().min(1),
  sessionDate: dateStr,
  records: z
    .array(
      z.object({
        studentId: z.string().min(1),
        status: z.enum(ATTENDANCE_STATUSES),
        notes: optionalTrimmed,
      })
    )
    .min(1, "At least one attendance record is required"),
});

// --- work logs ----------------------------------------------------------------

export const workLogCreateSchema = z.object({
  teacherId: z.string().min(1, "Teacher is required"),
  classId: optionalId,
  workDate: dateStr,
  startTime: timeStr,
  endTime: timeStr,
  breakMinutes: z.coerce.number().int().min(0).max(480).default(0),
  remarks: optionalTrimmed,
});
export const workLogUpdateSchema = z.object({
  classId: optionalId,
  workDate: dateStr.optional(),
  startTime: timeStr.optional(),
  endTime: timeStr.optional(),
  breakMinutes: z.coerce.number().int().min(0).max(480).optional(),
  remarks: optionalTrimmed,
  adjustedMinutes: z.coerce.number().int().min(1).optional().or(z.literal("").transform(() => undefined)),
  adjustmentReason: optionalTrimmed,
});
export const workLogDecisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
});

// --- payroll ----------------------------------------------------------------

export const payrollGenerateSchema = z.object({
  month: monthStr,
  teacherId: optionalId, // omitted = all active teachers
});
export const payrollStatusSchema = z.object({
  status: z.enum(PAYROLL_STATUSES),
  paymentDate: dateStr.optional().or(z.literal("").transform(() => undefined)),
  paymentMethod: z.enum(PAYMENT_METHODS).optional().or(z.literal("").transform(() => undefined)),
  notes: optionalTrimmed,
});
export const payrollAdjustmentSchema = z.object({
  type: z.enum(ADJUSTMENT_TYPES),
  amount: positiveAmountCents,
  reason: z.string().trim().min(1, "A reason is required for every adjustment").max(500),
});

// --- users ----------------------------------------------------------------

export const userCreateSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email")),
  name: z.string().trim().min(1, "Name is required").max(200),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(ROLES),
  teacherId: optionalId,
});
export const userUpdateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional().or(z.literal("").transform(() => undefined)),
  role: z.enum(ROLES).optional(),
  status: z.enum(USER_STATUSES).optional(),
  teacherId: optionalId,
});

// --- reports ----------------------------------------------------------------

export const REPORT_TYPES = [
  "students",
  "payments",
  "outstanding",
  "teachers",
  "work-hours",
  "payroll",
  "monthly-income",
  "monthly-expense",
  "tax-summary",
] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const reportQuerySchema = z.object({
  from: dateStr.optional(),
  to: dateStr.optional(),
});
