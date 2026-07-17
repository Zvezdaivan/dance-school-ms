import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Permission, Role, roleCan } from "./constants";
import { ApiError } from "./api-error";

export const SESSION_COOKIE = "dsms_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  teacherId: string | null;
}

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({
    email: user.email,
    name: user.name,
    role: user.role,
    teacherId: user.teacherId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS)
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return {
      id: payload.sub as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as Role,
      teacherId: (payload.teacherId as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Current session user, or null. For server components and route handlers.
 *
 * The signed token only proves who logged in; the account is re-checked
 * against the database on every request so that deactivated/deleted users
 * lose access immediately and role changes take effect without re-login.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload) return null;
  const { prisma } = await import("./db");
  const dbUser = await prisma.user.findUnique({ where: { id: payload.id } });
  if (!dbUser || dbUser.status !== "ACTIVE") return null;
  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role as Role,
    teacherId: dbUser.teacherId,
  };
}

/**
 * For server components/pages: redirect to /login when unauthenticated,
 * to /forbidden when the role lacks the permission.
 */
export async function requireUser(permission?: Permission): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (permission && !roleCan(user.role, permission)) redirect("/forbidden");
  return user;
}

/** For API route handlers: throws ApiError(401/403) instead of redirecting. */
export async function requireApiUser(permission?: Permission): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new ApiError(401, "Not signed in");
  if (permission && !roleCan(user.role, permission)) {
    throw new ApiError(403, "You do not have permission to perform this action");
  }
  return user;
}

export function can(user: SessionUser, permission: Permission): boolean {
  return roleCan(user.role, permission);
}
