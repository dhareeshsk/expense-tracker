import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/current-user";

const budgetSchema = z.object({
  categoryName: z.string().trim().min(1).max(50),
  monthlyLimit: z.number().positive().finite(),
  alertThreshold: z.number().int().min(1).max(200).optional(),
});

function currentMonthRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

async function assertMember(householdId: string, userId: string) {
  return Boolean(
    await prisma.householdMember.findUnique({
      where: { householdId_userId: { householdId, userId } },
    }),
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: householdId } = await params;
  if (!(await assertMember(householdId, userId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { start, end } = currentMonthRange();

  const [budgets, transactions] = await Promise.all([
    prisma.householdBudget.findMany({
      where: { householdId },
      orderBy: { categoryName: "asc" },
    }),
    prisma.transaction.findMany({
      where: {
        householdId,
        transactionType: { name: "Expense" },
        date: { gte: start, lt: end },
      },
      include: { category: true },
    }),
  ]);

  const spentByCategoryName = new Map<string, number>();
  for (const tx of transactions) {
    const key = tx.category.name;
    spentByCategoryName.set(
      key,
      (spentByCategoryName.get(key) ?? 0) + Number(tx.amount),
    );
  }

  return NextResponse.json(
    budgets.map((budget) => ({
      ...budget,
      spent: spentByCategoryName.get(budget.categoryName) ?? 0,
    })),
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: householdId } = await params;
  if (!(await assertMember(householdId, userId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = budgetSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const budget = await prisma.householdBudget.upsert({
    where: {
      householdId_categoryName: {
        householdId,
        categoryName: parsed.data.categoryName,
      },
    },
    create: {
      householdId,
      categoryName: parsed.data.categoryName,
      monthlyLimit: parsed.data.monthlyLimit,
      alertThreshold: parsed.data.alertThreshold ?? 80,
    },
    update: {
      monthlyLimit: parsed.data.monthlyLimit,
      ...(parsed.data.alertThreshold !== undefined
        ? { alertThreshold: parsed.data.alertThreshold }
        : {}),
    },
  });

  return NextResponse.json(budget, { status: 201 });
}
