import { requireUser } from "@/lib/auth";
import { toDateInput } from "@/lib/dates";
import { PageHeader } from "@/components/ui";
import { StudentForm } from "@/components/StudentForm";

export default async function NewStudentPage() {
  await requireUser("students.write");
  return (
    <>
      <PageHeader title="New student" />
      <StudentForm initial={{ enrollmentDate: toDateInput(new Date()) }} />
    </>
  );
}
