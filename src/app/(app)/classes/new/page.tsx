import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { ClassForm } from "@/components/ClassForm";
import { teacherOptions } from "@/server/services/teachers";

export default async function NewClassPage() {
  await requireUser("classes.write");
  const teachers = await teacherOptions();
  return (
    <>
      <PageHeader title="New class" />
      <ClassForm teachers={teachers} />
    </>
  );
}
