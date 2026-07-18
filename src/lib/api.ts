import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { ApiError, DomainError } from "./api-error";

/**
 * Wrap a route handler with consistent error handling:
 * - zod validation errors  → 400 with field details
 * - ApiError               → its status and message
 * - unique-constraint hits → 409
 * - anything else          → 500 (logged server-side, generic message to client)
 */
export function handleRoute<Args extends unknown[]>(
  fn: (...args: Args) => Promise<NextResponse | Response>
): (...args: Args) => Promise<NextResponse | Response> {
  return async (...args: Args) => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof ZodError) {
        return NextResponse.json(
          {
            error: "Validation failed",
            details: err.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
          },
          { status: 400 }
        );
      }
      if (err instanceof ApiError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      if (err instanceof DomainError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return NextResponse.json({ error: "A record with the same unique value already exists" }, { status: 409 });
      }
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
        // Foreign-key violation — a referenced record does not exist.
        return NextResponse.json(
          { error: "A selected item no longer exists — refresh the page and try again" },
          { status: 400 }
        );
      }
      console.error("[api] unhandled error:", err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}

export function ok(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}
