import { requireUser } from "@/lib/auth";
import { toDateInput } from "@/lib/dates";
import { centsToDollars } from "@/lib/money";
import { PageHeader } from "@/components/ui";
import { TeacherForm } from "@/components/TeacherForm";
import { getTeacher } from "@/server/services/teachers";

export default async function EditTeacherPage(props: { params: Promise<{ id: string }> }) {
  await requireUser("teachers.write");
  const { id } = await props.params;
  const t = await getTeacher(id);
  return (
    <>
      <PageHeader title={`Edit ${t.fullName}`} />
      <TeacherForm
        initial={{
          id: t.id,
          fullName: t.fullName,
          contactNumber: t.contactNumber,
          email: t.email,
          employmentType: t.employmentType,
          hourlyRate: t.hourlyRateCents != null ? String(centsToDollars(t.hourlyRateCents)) : "",
          monthlySalary: t.monthlySalaryCents != null ? String(centsToDollars(t.monthlySalaryCents)) : "",
          bankName: t.bankName,
          bankAccountName: t.bankAccountName,
          bankAccountNumber: t.bankAccountNumber,
          startDate: toDateInput(t.startDate),
          status: t.status,
          notes: t.notes,
        }}
      />
    </>
  );
}
