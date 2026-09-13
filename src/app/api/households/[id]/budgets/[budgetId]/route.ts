import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/current-user";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; budgetId: string }> },
) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: householdId, budgetId } = await params;
  const membership = await prisma.householdMember.findUnique({
    where: { householdId_userId: { householdId, userId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const budget = await prisma.householdBudget.findUnique({
    where: { id: budgetId },
  });
  if (!budget || budget.householdId !== householdId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.householdBudget.delete({ where: { id: budgetId } });

  return NextResponse.json({ ok: true });
}
