import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/current-user";

const budgetSchema = z.object({
  categoryId: z.string().min(1),
  monthlyLimit: z.number().positive().finite(),
  alertThreshold: z.number().int().min(1).max(200).optional(),
});

function currentMonthRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

export async function GET() {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { start, end } = currentMonthRange();

  const [budgets, spentByCategory] = await Promise.all([
    prisma.budget.findMany({
      where: { userId },
      include: { category: true },
      orderBy: { category: { name: "asc" } },
    }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { userId, type: "expense", date: { gte: start, lt: end } },
      _sum: { amount: true },
    }),
  ]);

  const spentMap = new Map(
    spentByCategory.map((row) => [row.categoryId, Number(row._sum.amount ?? 0)]),
  );

  const result = budgets.map((budget) => ({
    ...budget,
    spent: spentMap.get(budget.categoryId) ?? 0,
  }));

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = budgetSchema.safeParse(await request.json().catch(() => null));
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

  const budget = await prisma.budget.upsert({
    where: {
      userId_categoryId: { userId, categoryId: parsed.data.categoryId },
    },
    create: {
      userId,
      categoryId: parsed.data.categoryId,
      monthlyLimit: parsed.data.monthlyLimit,
      alertThreshold: parsed.data.alertThreshold ?? 80,
    },
    update: {
      monthlyLimit: parsed.data.monthlyLimit,
      ...(parsed.data.alertThreshold !== undefined
        ? { alertThreshold: parsed.data.alertThreshold }
        : {}),
    },
    include: { category: true },
  });

  return NextResponse.json(budget, { status: 201 });
}
