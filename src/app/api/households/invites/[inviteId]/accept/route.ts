import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/current-user";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ inviteId: string }> },
) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { inviteId } = await params;
  const invite = await prisma.householdInvite.findUnique({
    where: { id: inviteId },
  });
  if (!invite || invite.email !== user.email) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.householdMember.upsert({
      where: {
        householdId_userId: {
          householdId: invite.householdId,
          userId: user.id,
        },
      },
      create: { householdId: invite.householdId, userId: user.id },
      update: {},
    }),
    prisma.householdInvite.delete({ where: { id: inviteId } }),
  ]);

  return NextResponse.json({ ok: true, householdId: invite.householdId });
}
