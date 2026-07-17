import { requireUser } from "@/lib/auth";
import { toDateInput } from "@/lib/dates";
import { PageHeader } from "@/components/ui";
import { StudentForm } from "@/components/StudentForm";
import { getStudent } from "@/server/services/students";

export default async function EditStudentPage(props: { params: Promise<{ id: string }> }) {
  await requireUser("students.write");
  const { id } = await props.params;
  const s = await getStudent(id);
  return (
    <>
      <PageHeader title={`Edit ${s.fullName}`} />
      <StudentForm
        initial={{
          id: s.id,
          fullName: s.fullName,
          contactNumber: s.contactNumber,
          email: s.email,
          dateOfBirth: toDateInput(s.dateOfBirth),
          guardianName: s.guardianName,
          guardianPhone: s.guardianPhone,
          address: s.address,
          enrollmentDate: toDateInput(s.enrollmentDate),
          status: s.status,
          notes: s.notes,
          medicalNotes: s.medicalNotes,
        }}
      />
    </>
  );
}
