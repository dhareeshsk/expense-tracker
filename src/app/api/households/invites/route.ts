import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/current-user";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invites = await prisma.householdInvite.findMany({
    where: { email: user.email },
    include: { household: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    invites.map((invite) => ({
      id: invite.id,
      householdId: invite.householdId,
      householdName: invite.household.name,
      createdAt: invite.createdAt,
    })),
  );
}
