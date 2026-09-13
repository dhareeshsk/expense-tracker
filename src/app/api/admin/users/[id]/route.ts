import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/current-user";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      categories: {
        select: { id: true, name: true, color: true, isDefault: true },
      },
      budgets: {
        select: {
          id: true,
          monthlyLimit: true,
          alertThreshold: true,
          category: { select: { name: true } },
        },
      },
      memberships: {
        select: { household: { select: { id: true, name: true } } },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const transactions = await prisma.transaction.findMany({
    where: { userId: id },
    orderBy: { date: "desc" },
    take: 50,
    select: {
      id: true,
      amount: true,
      date: true,
      note: true,
      category: { select: { name: true } },
      transactionType: { select: { name: true } },
    },
  });

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    categories: user.categories,
    budgets: user.budgets.map((b) => ({
      id: b.id,
      categoryName: b.category.name,
      monthlyLimit: b.monthlyLimit,
      alertThreshold: b.alertThreshold,
    })),
    households: user.memberships.map((m) => m.household),
    recentTransactions: transactions,
  });
}
