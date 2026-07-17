import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { ReportCard } from "@/components/ReportCard";

const REPORTS: { type: string; title: string; description: string; dateRange: boolean }[] = [
  { type: "students", title: "Student list", description: "All students with contact, guardian, and status details.", dateRange: false },
  { type: "payments", title: "Student payments", description: "Every payment in the period with per-status totals.", dateRange: true },
  { type: "outstanding", title: "Outstanding payments", description: "Pending and overdue amounts grouped by student.", dateRange: false },
  { type: "teachers", title: "Teacher list", description: "Teachers with rates and bank details (confidential).", dateRange: false },
  { type: "work-hours", title: "Teacher working hours", description: "Work logs with payable hours and per-teacher approved totals.", dateRange: true },
  { type: "payroll", title: "Teacher payroll", description: "Payroll lines: base, adjustments, gross, net, status.", dateRange: true },
  { type: "monthly-income", title: "Monthly income", description: "Paid income grouped by month and payment type.", dateRange: true },
  { type: "monthly-expense", title: "Monthly expense (payroll)", description: "Approved/paid payroll cost grouped by month.", dateRange: true },
  { type: "tax-summary", title: "Tax / accounting summary", description: "Income vs payroll expense per month, for the accountant.", dateRange: true },
];

export default async function ReportsPage() {
  await requireUser("reports.export");
  return (
    <>
      <PageHeader
        title="Excel Reports"
        subtitle="Files save to your browser's Downloads folder as .xlsx. Every export is logged in the audit trail."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {REPORTS.map((r) => (
          <ReportCard key={r.type} {...r} />
        ))}
      </div>
    </>
  );
}
