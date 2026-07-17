import { NextRequest } from "next/server";
import { handleRoute, ok } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { paymentCreateSchema } from "@/lib/validation";
import { createPayment, listPayments } from "@/server/services/payments";

export const GET = handleRoute(async (req: NextRequest) => {
  await requireApiUser("payments.read");
  const sp = req.nextUrl.searchParams;
  return ok(
    await listPayments({
      studentId: sp.get("studentId") ?? undefined,
      status: sp.get("status") ?? undefined,
      method: sp.get("method") ?? undefined,
      paymentType: sp.get("paymentType") ?? undefined,
      from: sp.get("from") ?? undefined,
      to: sp.get("to") ?? undefined,
      page: sp.get("page") ? Number(sp.get("page")) : undefined,
    })
  );
});

export const POST = handleRoute(async (req: NextRequest) => {
  const user = await requireApiUser("payments.write");
  const input = paymentCreateSchema.parse(await req.json());
  return ok(await createPayment(user, input), 201);
});
