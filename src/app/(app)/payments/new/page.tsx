import { requireUser } from "@/lib/auth";
import { toDateInput } from "@/lib/dates";
import { PageHeader } from "@/components/ui";
import { PaymentForm } from "@/components/PaymentForm";
import { studentOptions } from "@/server/services/students";

export default async function NewPaymentPage(props: { searchParams: Promise<{ studentId?: string }> }) {
  await requireUser("payments.write");
  const { studentId } = await props.searchParams;
  const students = await studentOptions();
  return (
    <>
      <PageHeader title="Record payment" />
      <PaymentForm students={students} defaultStudentId={studentId} defaultDate={toDateInput(new Date())} />
    </>
  );
}
