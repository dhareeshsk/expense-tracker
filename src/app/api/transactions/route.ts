import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/current-user";

const transactionSchema = z.object({
  type: z.enum(["income", "expense", "investment"]),
  amount: z.number().positive().finite(),
  categoryId: z.string().min(1),
  date: z.coerce.date(),
  note: z.string().trim().max(500).optional().nullable(),
  paymentMethod: z.string().trim().max(50).optional().nullable(),
  householdId: z.string().min(1).optional().nullable(),
});

export async function GET(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const categoryId = searchParams.get("categoryId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      ...(type === "income" || type === "expense" || type === "investment"
        ? { type }
        : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
    include: { category: true },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(transactions);
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = transactionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const category = await prisma.category.findUnique({
    where: { id: parsed.data.categoryId },
  });
  if (!category || category.userId !== userId) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  if (parsed.data.householdId) {
    const membership = await prisma.householdMember.findUnique({
      where: {
        householdId_userId: { householdId: parsed.data.householdId, userId },
      },
    });
    if (!membership) {
      return NextResponse.json({ error: "Invalid household" }, { status: 400 });
    }
  }

  const transaction = await prisma.transaction.create({
    data: { ...parsed.data, userId },
    include: { category: true },
  });

  return NextResponse.json(transaction, { status: 201 });
}
