import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/current-user";

export async function GET() {
  const admin = await requireSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const [totalUsers, totalHouseholds, totalTransactions, activeThisMonth] =
    await Promise.all([
      prisma.user.count(),
      prisma.household.count(),
      prisma.transaction.count(),
      prisma.user.count({
        where: { transactions: { some: { createdAt: { gte: startOfMonth } } } },
      }),
    ]);

  return NextResponse.json({
    totalUsers,
    totalHouseholds,
    totalTransactions,
    activeThisMonth,
  });
}
