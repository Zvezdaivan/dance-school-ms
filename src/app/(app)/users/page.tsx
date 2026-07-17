import { requireUser } from "@/lib/auth";
import { fmtDate } from "@/lib/dates";
import { label } from "@/lib/constants";
import { Badge, PageHeader } from "@/components/ui";
import { ActionButton } from "@/components/actions";
import { UserForm } from "@/components/UserForm";
import { listUsers } from "@/server/services/users";
import { teacherOptions } from "@/server/services/teachers";

export default async function UsersPage() {
  const me = await requireUser("users.manage");
  const [users, teachers] = await Promise.all([listUsers(), teacherOptions()]);

  return (
    <>
      <PageHeader title="Users & Roles" subtitle="Accounts that can sign in to this system" />

      <div className="card mb-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Create account</h2>
        <UserForm teachers={teachers} />
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Linked teacher</th><th>Status</th><th>Created</th><th></th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="font-medium">{u.name}{u.id === me.id && <span className="ml-1.5 text-xs text-gray-400">(you)</span>}</td>
                <td>{u.email}</td>
                <td>{label(u.role)}</td>
                <td>{u.teacher?.fullName ?? "—"}</td>
                <td><Badge value={u.status} /></td>
                <td>{fmtDate(u.createdAt)}</td>
                <td className="text-right">
                  {u.id !== me.id &&
                    (u.status === "ACTIVE" ? (
                      <ActionButton
                        label="Deactivate"
                        url={`/api/users/${u.id}`}
                        method="PATCH"
                        body={{ status: "INACTIVE" }}
                        variant="danger"
                        confirmText={`Deactivate ${u.email}? They will no longer be able to sign in.`}
                      />
                    ) : (
                      <ActionButton label="Reactivate" url={`/api/users/${u.id}`} method="PATCH" body={{ status: "ACTIVE" }} />
                    ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
