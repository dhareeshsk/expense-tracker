import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/current-user";

type PeriodType = "day" | "month" | "year";

function monthRange(year: number, month: number) {
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 1));
  return { start, end };
}

function dayRange(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1));
  return { start, end };
}

function yearRange(year: number) {
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));
  return { start, end };
}

function previousRange(periodType: PeriodType, start: Date, end: Date) {
  if (periodType === "day") {
    const prevStart = new Date(start.getTime() - (end.getTime() - start.getTime()));
    return { start: prevStart, end: start };
  }
  if (periodType === "year") {
    const y = start.getUTCFullYear();
    return yearRange(y - 1);
  }
  // month
  const y = start.getUTCFullYear();
  const m = start.getUTCMonth();
  return monthRange(m === 0 ? y - 1 : y, m === 0 ? 11 : m - 1);
}

function formatPeriodLabel(periodType: PeriodType, start: Date) {
  if (periodType === "day") {
    return start.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  }
  if (periodType === "year") {
    return String(start.getUTCFullYear());
  }
  return start.toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

async function aggregateTotals(userId: string, start: Date, end: Date) {
  const rows = await prisma.transaction.groupBy({
    by: ["transactionTypeId"],
    where: { userId, date: { gte: start, lt: end } },
    _sum: { amount: true },
  });

  const types = await prisma.transactionType.findMany({
    where: { userId },
    select: { id: true, name: true },
  });
  const nameById = new Map(types.map((t) => [t.id, t.name]));

  let totalIncome = 0;
  let totalExpense = 0;
  let totalInvestment = 0;
  for (const row of rows) {
    const name = nameById.get(row.transactionTypeId);
    const amount = Number(row._sum.amount ?? 0);
    if (name === "Income") totalIncome += amount;
    if (name === "Expense") totalExpense += amount;
    if (name === "Investment") totalInvestment += amount;
  }

  return { totalIncome, totalExpense, totalInvestment };
}

export async function GET(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const periodType = (searchParams.get("periodType") as PeriodType) || "month";
  const year = Number(searchParams.get("year") ?? now.getUTCFullYear());
  const month = Number(searchParams.get("month") ?? now.getUTCMonth());
  const date = searchParams.get("date") ?? now.toISOString().slice(0, 10);

  const { start, end } =
    periodType === "day"
      ? dayRange(date)
      : periodType === "year"
        ? yearRange(year)
        : monthRange(year, month);
  const prev = previousRange(periodType, start, end);

  const [currentTransactions, previousTotals, transactionTypes] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, date: { gte: start, lt: end } },
      include: { category: true, transactionType: true },
    }),
    aggregateTotals(userId, prev.start, prev.end),
    prisma.transactionType.findMany({ where: { userId }, select: { id: true, name: true } }),
  ]);

  let totalIncome = 0;
  let totalExpense = 0;
  let totalInvestment = 0;
  const expenseByCategory = new Map<
    string,
    { categoryId: string; name: string; color: string | null; total: number }
  >();

  for (const tx of currentTransactions) {
    const amount = Number(tx.amount);
    const typeName = tx.transactionType.name;
    if (typeName === "Income") totalIncome += amount;
    if (typeName === "Expense") {
      totalExpense += amount;
      const existing = expenseByCategory.get(tx.categoryId);
      if (existing) {
        existing.total += amount;
      } else {
        expenseByCategory.set(tx.categoryId, {
          categoryId: tx.categoryId,
          name: tx.category.name,
          color: tx.category.color,
          total: amount,
        });
      }
    }
    if (typeName === "Investment") totalInvestment += amount;
  }

  // Trailing 12 months trend, anchored to the real current month (independent of
  // the selected period filter) — one query instead of 12 sequential round-trips.
  const trendAnchor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const trendStart = new Date(
    Date.UTC(trendAnchor.getUTCFullYear(), trendAnchor.getUTCMonth() - 11, 1),
  );
  const trendEnd = new Date(
    Date.UTC(trendAnchor.getUTCFullYear(), trendAnchor.getUTCMonth() + 1, 1),
  );
  const trendTransactions = await prisma.transaction.findMany({
    where: { userId, date: { gte: trendStart, lt: trendEnd } },
    select: { amount: true, date: true, transactionType: { select: { name: true } } },
  });

  const monthlyTrend: {
    year: number;
    month: number;
    income: number;
    expense: number;
    investment: number;
  }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(
      Date.UTC(trendAnchor.getUTCFullYear(), trendAnchor.getUTCMonth() - i, 1),
    );
    monthlyTrend.push({
      year: d.getUTCFullYear(),
      month: d.getUTCMonth(),
      income: 0,
      expense: 0,
      investment: 0,
    });
  }
  for (const tx of trendTransactions) {
    const amount = Number(tx.amount);
    const txDate = new Date(tx.date);
    const idx =
      (txDate.getUTCFullYear() - trendAnchor.getUTCFullYear()) * 12 +
      (txDate.getUTCMonth() - trendAnchor.getUTCMonth()) +
      11;
    const entry = monthlyTrend[idx];
    if (!entry) continue;
    const name = tx.transactionType.name;
    if (name === "Income") entry.income += amount;
    if (name === "Expense") entry.expense += amount;
    if (name === "Investment") entry.investment += amount;
  }

  const typeIds = {
    income: transactionTypes.find((t) => t.name === "Income")?.id ?? null,
    expense: transactionTypes.find((t) => t.name === "Expense")?.id ?? null,
    investment: transactionTypes.find((t) => t.name === "Investment")?.id ?? null,
  };

  return NextResponse.json({
    periodType,
    year,
    month,
    date,
    periodLabel: formatPeriodLabel(periodType, start),
    previousPeriodLabel: formatPeriodLabel(periodType, prev.start),
    periodRange: { from: start.toISOString(), to: new Date(end.getTime() - 1).toISOString() },
    totalIncome,
    totalExpense,
    totalInvestment,
    netBalance: totalIncome - totalExpense - totalInvestment,
    previous: {
      totalIncome: previousTotals.totalIncome,
      totalExpense: previousTotals.totalExpense,
      totalInvestment: previousTotals.totalInvestment,
      netBalance:
        previousTotals.totalIncome - previousTotals.totalExpense - previousTotals.totalInvestment,
    },
    typeIds,
    expenseByCategory: Array.from(expenseByCategory.values()),
    monthlyTrend,
  });
}
