import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/current-user";
import { createNotification } from "@/lib/notifications";

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export async function POST(
  request: Request,
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

  const parsed = inviteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { email } = parsed.data;

  const existingMember = await prisma.householdMember.findFirst({
    where: { householdId, user: { email } },
  });
  if (existingMember) {
    return NextResponse.json(
      { error: "This person is already a member" },
      { status: 409 },
    );
  }

  const existingInvite = await prisma.householdInvite.findUnique({
    where: { householdId_email: { householdId, email } },
  });
  if (existingInvite) {
    return NextResponse.json(
      { error: "An invite has already been sent to this email" },
      { status: 409 },
    );
  }

  const invite = await prisma.householdInvite.create({
    data: { householdId, email },
  });

  const [household, invitedUser] = await Promise.all([
    prisma.household.findUnique({ where: { id: householdId } }),
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
  ]);

  if (invitedUser) {
    await createNotification({
      userId: invitedUser.id,
      type: "household",
      message: `You've been invited to join ${household?.name ?? "a household"}`,
      relatedId: householdId,
      pushUrl: "/households",
    });
  }

  return NextResponse.json(invite, { status: 201 });
}
