import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/current-user";

function currentMonthRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
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
  const membership = await prisma.householdMember.findUnique({
    where: { householdId_userId: { householdId, userId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { start, end } = currentMonthRange();

  const transactions = await prisma.transaction.findMany({
    where: { householdId, date: { gte: start, lt: end } },
    include: { category: true, user: true, transactionType: true },
    orderBy: { date: "desc" },
  });

  let totalShared = 0;
  const byCategory = new Map<string, { name: string; color: string | null; total: number }>();
  const byMember = new Map<string, { name: string | null; email: string; total: number }>();

  for (const tx of transactions) {
    const amount = Number(tx.amount);
    totalShared += amount;

    const cat = byCategory.get(tx.category.name);
    if (cat) {
      cat.total += amount;
    } else {
      byCategory.set(tx.category.name, {
        name: tx.category.name,
        color: tx.category.color,
        total: amount,
      });
    }

    const member = byMember.get(tx.userId);
    if (member) {
      member.total += amount;
    } else {
      byMember.set(tx.userId, {
        name: tx.user.name,
        email: tx.user.email,
        total: amount,
      });
    }
  }

  return NextResponse.json({
    totalShared,
    byCategory: Array.from(byCategory.values()),
    byMember: Array.from(byMember.values()),
    transactions: transactions.map((tx) => ({
      id: tx.id,
      transactionType: { name: tx.transactionType.name },
      amount: tx.amount,
      date: tx.date,
      note: tx.note,
      category: { name: tx.category.name, color: tx.category.color },
      memberName: tx.user.name,
      memberEmail: tx.user.email,
    })),
  });
}
