import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleRoute } from "@/lib/api";
import { ApiError } from "@/lib/api-error";
import { SESSION_COOKIE, signSession, verifyPassword } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { Role } from "@/lib/constants";

export const POST = handleRoute(async (req: NextRequest) => {
  const { email, password } = loginSchema.parse(await req.json());
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new ApiError(401, "Invalid email or password");
  }
  if (user.status !== "ACTIVE") throw new ApiError(403, "This account has been deactivated");

  const session = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    teacherId: user.teacherId,
  };
  const token = await signSession(session);
  await prisma.auditLog.create({
    data: { userId: user.id, userEmail: user.email, action: "LOGIN", entityType: "User", entityId: user.id, summary: `${user.email} signed in` },
  });

  const res = NextResponse.json({ ok: true, user: { name: user.name, role: user.role } });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
});
