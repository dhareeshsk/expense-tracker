import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/current-user";

const transactionTypeSchema = z.object({
  name: z.string().trim().min(1).max(40),
  icon: z.string().trim().max(50).optional().nullable(),
});

export async function GET() {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const transactionTypes = await prisma.transactionType.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });

  return NextResponse.json(transactionTypes);
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = transactionTypeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const existing = await prisma.transactionType.findUnique({
    where: { userId_name: { userId, name: parsed.data.name } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "A transaction type with this name already exists" },
      { status: 409 },
    );
  }

  const transactionType = await prisma.transactionType.create({
    data: { ...parsed.data, userId },
  });

  return NextResponse.json(transactionType, { status: 201 });
}
