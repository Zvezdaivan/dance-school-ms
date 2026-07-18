import { requireUser } from "@/lib/auth";
import { centsToDollars } from "@/lib/money";
import { PageHeader } from "@/components/ui";
import { ClassForm } from "@/components/ClassForm";
import { getClass } from "@/server/services/classes";
import { teacherOptions } from "@/server/services/teachers";

export default async function EditClassPage(props: { params: Promise<{ id: string }> }) {
  const user = await requireUser("classes.write");
  const { id } = await props.params;
  const [cls, teachers] = await Promise.all([getClass(user, id), teacherOptions()]);
  return (
    <>
      <PageHeader title={`Edit ${cls.name}`} />
      <ClassForm
        teachers={teachers}
        initial={{
          id: cls.id,
          name: cls.name,
          style: cls.style,
          level: cls.level,
          teacherId: cls.teacherId,
          dayOfWeek: cls.dayOfWeek != null ? String(cls.dayOfWeek) : "",
          startTime: cls.startTime,
          endTime: cls.endTime,
          scheduleNotes: cls.scheduleNotes,
          capacity: String(cls.capacity),
          fee: String(centsToDollars(cls.feeCents)),
          feeType: cls.feeType,
          status: cls.status,
        }}
      />
    </>
  );
}
