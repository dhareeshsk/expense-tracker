import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/current-user";

const renameSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

async function assertMember(householdId: string, userId: string) {
  const membership = await prisma.householdMember.findUnique({
    where: { householdId_userId: { householdId, userId } },
  });
  return Boolean(membership);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!(await assertMember(id, userId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const household = await prisma.household.findUnique({
    where: { id },
    include: {
      members: { include: { user: true } },
      invites: true,
    },
  });
  if (!household) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: household.id,
    name: household.name,
    createdAt: household.createdAt,
    members: household.members.map((m) => ({
      id: m.id,
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
    })),
    invites: household.invites.map((i) => ({ id: i.id, email: i.email })),
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!(await assertMember(id, userId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = renameSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const household = await prisma.household.update({
    where: { id },
    data: { name: parsed.data.name },
  });

  return NextResponse.json(household);
}
