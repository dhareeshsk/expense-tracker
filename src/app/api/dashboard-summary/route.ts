import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/current-user";

function monthRange(year: number, month: number) {
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 1));
  return { start, end };
}

export async function GET(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const year = Number(searchParams.get("year") ?? now.getUTCFullYear());
  const month = Number(searchParams.get("month") ?? now.getUTCMonth());

  const { start, end } = monthRange(year, month);

  const monthTransactions = await prisma.transaction.findMany({
    where: { userId, date: { gte: start, lt: end } },
    include: { category: true },
  });

  let totalIncome = 0;
  let totalExpense = 0;
  let totalInvestment = 0;
  const expenseByCategory = new Map<
    string,
    { name: string; color: string | null; total: number }
  >();

  for (const tx of monthTransactions) {
    const amount = Number(tx.amount);
    if (tx.type === "income") totalIncome += amount;
    if (tx.type === "expense") {
      totalExpense += amount;
      const existing = expenseByCategory.get(tx.categoryId);
      if (existing) {
        existing.total += amount;
      } else {
        expenseByCategory.set(tx.categoryId, {
          name: tx.category.name,
          color: tx.category.color,
          total: amount,
        });
      }
    }
    if (tx.type === "investment") totalInvestment += amount;
  }

  const monthlyTrend: {
    year: number;
    month: number;
    income: number;
    expense: number;
    investment: number;
  }[] = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(year, month - i, 1));
    const range = monthRange(d.getUTCFullYear(), d.getUTCMonth());
    const txs = await prisma.transaction.findMany({
      where: { userId, date: { gte: range.start, lt: range.end } },
      select: { type: true, amount: true },
    });
    const entry = {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth(),
      income: 0,
      expense: 0,
      investment: 0,
    };
    for (const tx of txs) {
      const amount = Number(tx.amount);
      if (tx.type === "income") entry.income += amount;
      if (tx.type === "expense") entry.expense += amount;
      if (tx.type === "investment") entry.investment += amount;
    }
    monthlyTrend.push(entry);
  }

  return NextResponse.json({
    year,
    month,
    totalIncome,
    totalExpense,
    totalInvestment,
    netBalance: totalIncome - totalExpense - totalInvestment,
    expenseByCategory: Array.from(expenseByCategory.values()),
    monthlyTrend,
  });
}
