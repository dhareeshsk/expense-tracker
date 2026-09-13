import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/current-user";

const categorySchema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  color: z.string().trim().max(20).optional().nullable(),
  icon: z.string().trim().max(50).optional().nullable(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category || category.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = categorySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  if (parsed.data.name && parsed.data.name !== category.name) {
    const existing = await prisma.category.findUnique({
      where: { userId_name: { userId, name: parsed.data.name } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A category with this name already exists" },
        { status: 409 },
      );
    }
  }

  const updated = await prisma.category.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category || category.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const transactionCount = await prisma.transaction.count({
    where: { categoryId: id },
  });
  if (transactionCount > 0) {
    return NextResponse.json(
      { error: "Cannot delete a category that has transactions" },
      { status: 409 },
    );
  }

  await prisma.category.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
