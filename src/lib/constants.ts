// Single source of truth for enum-like values (SQLite has no native enums)
// and for role-based access control.

export const ROLES = ["ADMIN", "MANAGER", "STAFF", "TEACHER"] as const;
export type Role = (typeof ROLES)[number];

export const USER_STATUSES = ["ACTIVE", "INACTIVE"] as const;

export const STUDENT_STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED", "GRADUATED"] as const;

export const TEACHER_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export const EMPLOYMENT_TYPES = ["HOURLY", "MONTHLY", "CONTRACTOR"] as const;

export const CLASS_LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "OPEN"] as const;
export const CLASS_STATUSES = ["ACTIVE", "INACTIVE", "COMPLETED"] as const;
export const FEE_TYPES = ["PER_CLASS", "MONTHLY", "PACKAGE"] as const;

export const ENROLLMENT_STATUSES = ["ACTIVE", "DROPPED", "COMPLETED"] as const;

export const PAYMENT_TYPES = [
  "MONTHLY_TUITION",
  "COURSE_PACKAGE",
  "SINGLE_CLASS",
  "REGISTRATION_FEE",
  "OTHER",
] as const;
export const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "FPS", "CREDIT_CARD", "CHEQUE", "OTHER"] as const;
export const PAYMENT_STATUSES = ["PAID", "PENDING", "OVERDUE", "REFUNDED"] as const;

export const ATTENDANCE_STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const;

export const APPROVAL_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;

export const PAYROLL_STATUSES = ["DRAFT", "APPROVED", "PAID"] as const;
export const ADJUSTMENT_TYPES = ["ALLOWANCE", "BONUS", "DEDUCTION"] as const;

export const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ---------------------------------------------------------------------------
// Human-readable labels for UI and Excel reports
// ---------------------------------------------------------------------------

export const LABELS: Record<string, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  STAFF: "Staff",
  TEACHER: "Teacher",
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  SUSPENDED: "Suspended",
  GRADUATED: "Graduated",
  HOURLY: "Hourly",
  MONTHLY: "Monthly salary",
  CONTRACTOR: "Contractor",
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
  OPEN: "Open level",
  COMPLETED: "Completed",
  DROPPED: "Dropped",
  PER_CLASS: "Per class",
  PACKAGE: "Package",
  MONTHLY_TUITION: "Monthly tuition",
  COURSE_PACKAGE: "Course package",
  SINGLE_CLASS: "Single class",
  REGISTRATION_FEE: "Registration fee",
  OTHER: "Other",
  CASH: "Cash",
  BANK_TRANSFER: "Bank transfer",
  FPS: "FPS",
  CREDIT_CARD: "Credit card",
  CHEQUE: "Cheque",
  PAID: "Paid",
  PENDING: "Pending",
  OVERDUE: "Overdue",
  REFUNDED: "Refunded",
  PRESENT: "Present",
  ABSENT: "Absent",
  LATE: "Late",
  EXCUSED: "Excused",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  DRAFT: "Draft",
  ALLOWANCE: "Allowance",
  BONUS: "Bonus",
  DEDUCTION: "Deduction",
};

export function label(value: string | null | undefined): string {
  if (!value) return "—";
  return LABELS[value] ?? value;
}

// ---------------------------------------------------------------------------
// Role-based access control
// ---------------------------------------------------------------------------

export const PERMISSIONS = [
  "students.read",
  "students.write",
  "payments.read",
  "payments.write",
  "teachers.read",
  "teachers.write",
  "classes.read",
  "classes.write",
  "attendance.read",
  "attendance.write",
  "worklogs.read",
  "worklogs.write",
  "worklogs.approve",
  "payroll.read",
  "payroll.write",
  "reports.export",
  "users.manage",
  "audit.read",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ALL: Permission[] = [...PERMISSIONS];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: ALL,
  MANAGER: ALL.filter((p) => p !== "users.manage" && p !== "audit.read"),
  STAFF: [
    "students.read",
    "students.write",
    "payments.read",
    "payments.write",
    "classes.read",
    "attendance.read",
    "attendance.write",
  ],
  // Teachers only see their own records; scoping is enforced in the service layer.
  TEACHER: ["classes.read", "worklogs.read", "worklogs.write", "payroll.read"],
};

export function roleCan(role: Role, permission: Permission): boolean {
  return (ROLE_PERMISSIONS[role] ?? []).includes(permission);
}
