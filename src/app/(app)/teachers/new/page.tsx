import { requireUser } from "@/lib/auth";
import { toDateInput } from "@/lib/dates";
import { PageHeader } from "@/components/ui";
import { TeacherForm } from "@/components/TeacherForm";

export default async function NewTeacherPage() {
  await requireUser("teachers.write");
  return (
    <>
      <PageHeader title="New teacher" />
      <TeacherForm initial={{ startDate: toDateInput(new Date()) }} />
    </>
  );
}
