import { prisma } from "@/lib/db";
import { hashPassword, SessionUser } from "@/lib/auth";
import { ApiError, orNotFound } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";
import { userCreateSchema, userUpdateSchema } from "@/lib/validation";
import { z } from "zod";

export async function listUsers() {
  return prisma.user.findMany({
    select: {
      id: true, email: true, name: true, role: true, status: true, createdAt: true,
      teacher: { select: { fullName: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function createUser(actor: SessionUser, input: z.infer<typeof userCreateSchema>) {
  if (input.role === "TEACHER" && !input.teacherId) {
    throw new ApiError(400, "Teacher accounts must be linked to a teacher record");
  }
  const user = await prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash: await hashPassword(input.password),
      role: input.role,
      teacherId: input.role === "TEACHER" ? input.teacherId : null,
    },
  });
  await logAudit(actor, {
    action: "CREATE",
    entityType: "User",
    entityId: user.id,
    summary: `Created ${input.role.toLowerCase()} account ${user.email}`,
  });
  return { id: user.id, email: user.email };
}

export async function updateUser(actor: SessionUser, id: string, input: z.infer<typeof userUpdateSchema>) {
  orNotFound(await prisma.user.findUnique({ where: { id } }), "User");
  if (id === actor.id && (input.status === "INACTIVE" || (input.role && input.role !== "ADMIN"))) {
    throw new ApiError(409, "You cannot deactivate or demote your own account");
  }
  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.role !== undefined) data.role = input.role;
  if (input.status !== undefined) data.status = input.status;
  if (input.teacherId !== undefined) data.teacherId = input.teacherId || null;
  if (input.password) data.passwordHash = await hashPassword(input.password);

  const user = await prisma.user.update({ where: { id }, data });
  await logAudit(actor, {
    action: "UPDATE",
    entityType: "User",
    entityId: id,
    summary: `Updated account ${user.email}${input.password ? " (password reset)" : ""}`,
  });
  return { id: user.id };
}
