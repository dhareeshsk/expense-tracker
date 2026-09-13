import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/current-user";
import { createNotification } from "@/lib/notifications";

const transactionSchema = z.object({
  transactionTypeId: z.string().min(1, "Transaction type is required"),
  amount: z
    .number({ error: "Amount is required" })
    .positive("Amount must be greater than 0")
    .finite("Amount must be a valid number"),
  categoryId: z.string().min(1, "Category is required"),
  date: z.coerce.date({ error: "Date is required" }),
  note: z.string().trim().max(500).optional().nullable(),
  paymentMethod: z
    .string()
    .trim()
    .min(1, "Payment method is required")
    .max(50, "Payment method must be 50 characters or fewer"),
  householdId: z.string().min(1).optional().nullable(),
});

export async function GET(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const transactionTypeId = searchParams.get("transactionTypeId");
  const categoryId = searchParams.get("categoryId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const q = searchParams.get("q")?.trim();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 20));

  const where = {
    userId,
    ...(transactionTypeId ? { transactionTypeId } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(from || to
      ? {
          date: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
    ...(q
      ? {
          OR: [
            { note: { contains: q, mode: "insensitive" as const } },
            { paymentMethod: { contains: q, mode: "insensitive" as const } },
            { category: { name: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { category: true, transactionType: true },
      orderBy: { date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.transaction.count({ where }),
  ]);

  return NextResponse.json({
    transactions,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
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

  const transactionType = await prisma.transactionType.findUnique({
    where: { id: parsed.data.transactionTypeId },
  });
  if (!transactionType || transactionType.userId !== userId) {
    return NextResponse.json({ error: "Invalid transaction type" }, { status: 400 });
  }

  const transaction = await prisma.transaction.create({
    data: { ...parsed.data, userId },
    include: { category: true, transactionType: true },
  });

  if (transaction.householdId) {
    const [household, actor, otherMembers] = await Promise.all([
      prisma.household.findUnique({ where: { id: transaction.householdId } }),
      prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }),
      prisma.householdMember.findMany({
        where: { householdId: transaction.householdId, userId: { not: userId } },
        select: { userId: true },
      }),
    ]);

    const actorLabel = actor?.name ?? actor?.email ?? "Someone";
    await Promise.all(
      otherMembers.map((member) =>
        createNotification({
          userId: member.userId,
          type: "household",
          message: `${actorLabel} added a ₹${Number(transaction.amount).toLocaleString("en-IN")} transaction to ${household?.name ?? "your household"}`,
          relatedId: transaction.householdId!,
          pushUrl: `/households/${transaction.householdId}`,
        }),
      ),
    );
  }

  return NextResponse.json(transaction, { status: 201 });
}
