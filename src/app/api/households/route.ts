import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/current-user";

const householdSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export async function GET() {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const households = await prisma.household.findMany({
    where: { members: { some: { userId } } },
    include: { members: { include: { user: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(
    households.map((h) => ({
      id: h.id,
      name: h.name,
      createdAt: h.createdAt,
      members: h.members.map((m) => ({
        id: m.id,
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
      })),
    })),
  );
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = householdSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const household = await prisma.household.create({
    data: {
      name: parsed.data.name,
      members: { create: { userId } },
    },
    include: { members: { include: { user: true } } },
  });

  return NextResponse.json(
    {
      id: household.id,
      name: household.name,
      createdAt: household.createdAt,
      members: household.members.map((m) => ({
        id: m.id,
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
      })),
    },
    { status: 201 },
  );
}
