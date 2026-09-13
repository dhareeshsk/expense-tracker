import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/current-user";

export async function POST(
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

  await prisma.householdMember.delete({ where: { id: membership.id } });

  const remaining = await prisma.householdMember.count({
    where: { householdId },
  });
  if (remaining === 0) {
    await prisma.household.delete({ where: { id: householdId } });
  }

  return NextResponse.json({ ok: true });
}
