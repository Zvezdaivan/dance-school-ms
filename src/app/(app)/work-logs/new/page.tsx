import { requireUser } from "@/lib/auth";
import { toDateInput } from "@/lib/dates";
import { PageHeader } from "@/components/ui";
import { WorkLogForm } from "@/components/WorkLogForm";
import { teacherOptions } from "@/server/services/teachers";
import { classOptions } from "@/server/services/classes";

export default async function NewWorkLogPage() {
  const user = await requireUser("worklogs.write");
  const isTeacher = user.role === "TEACHER";
  const [teachers, classes] = await Promise.all([
    isTeacher ? Promise.resolve([]) : teacherOptions(),
    classOptions(user),
  ]);
  return (
    <>
      <PageHeader title="Log working hours" />
      <WorkLogForm
        teachers={teachers}
        classes={classes}
        lockTeacher={isTeacher ? (user.teacherId ?? undefined) : undefined}
        initial={{ workDate: toDateInput(new Date()) }}
      />
    </>
  );
}
