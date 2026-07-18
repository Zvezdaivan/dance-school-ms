import { can, requireUser } from "@/lib/auth";
import { toDateInput } from "@/lib/dates";
import { PageHeader } from "@/components/ui";
import { WorkLogForm } from "@/components/WorkLogForm";
import { ActionButton } from "@/components/actions";
import { getWorkLog } from "@/server/services/worklogs";
import { classOptions } from "@/server/services/classes";

export default async function EditWorkLogPage(props: { params: Promise<{ id: string }> }) {
  const user = await requireUser("worklogs.write");
  const { id } = await props.params;
  const [log, classes] = await Promise.all([getWorkLog(user, id), classOptions(user)]);

  return (
    <>
      <PageHeader
        title={`Edit work log — ${log.teacher.fullName}`}
        subtitle={toDateInput(log.workDate)}
        action={
          <ActionButton
            label="Delete record"
            url={`/api/work-logs/${log.id}`}
            method="DELETE"
            variant="danger"
            confirmText="Delete this work-hour record? It is archived, not permanently removed."
            redirectTo="/work-logs"
          />
        }
      />
      <WorkLogForm
        classes={classes}
        teachers={[]}
        canAdjust={can(user, "worklogs.approve")}
        initial={{
          id: log.id,
          classId: log.classId,
          workDate: toDateInput(log.workDate),
          startTime: log.startTime,
          endTime: log.endTime,
          breakMinutes: String(log.breakMinutes),
          remarks: log.remarks,
          adjustedMinutes: log.adjustedMinutes != null ? String(log.adjustedMinutes) : "",
          adjustmentReason: log.adjustmentReason,
        }}
      />
    </>
  );
}
