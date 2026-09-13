import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/current-user";

const categorySchema = z.object({
  name: z.string().trim().min(1).max(50),
  color: z.string().trim().max(20).optional().nullable(),
  icon: z.string().trim().max(50).optional().nullable(),
});

export async function GET() {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const categories = await prisma.category.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });

  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = categorySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const existing = await prisma.category.findUnique({
    where: { userId_name: { userId, name: parsed.data.name } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "A category with this name already exists" },
      { status: 409 },
    );
  }

  const category = await prisma.category.create({
    data: { ...parsed.data, userId },
  });

  return NextResponse.json(category, { status: 201 });
}
