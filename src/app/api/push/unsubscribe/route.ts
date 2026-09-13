import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/current-user";

const unsubscribeSchema = z.object({
  endpoint: z.string().url(),
});

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = unsubscribeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  await prisma.pushSubscription.deleteMany({
    where: { endpoint: parsed.data.endpoint, userId },
  });

  return NextResponse.json({ ok: true });
}
