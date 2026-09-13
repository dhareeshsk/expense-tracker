import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/current-user";

const transactionSchema = z.object({
  type: z.enum(["income", "expense", "investment"]).optional(),
  amount: z.number().positive().finite().optional(),
  categoryId: z.string().min(1).optional(),
  date: z.coerce.date().optional(),
  note: z.string().trim().max(500).optional().nullable(),
  paymentMethod: z.string().trim().max(50).optional().nullable(),
  householdId: z.string().min(1).optional().nullable(),
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
  const transaction = await prisma.transaction.findUnique({ where: { id } });
  if (!transaction || transaction.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = transactionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  if (parsed.data.categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: parsed.data.categoryId },
    });
    if (!category || category.userId !== userId) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
  }

  if (parsed.data.householdId) {
    const membership = await prisma.householdMember.findUnique({
      where: {
        householdId_userId: { householdId: parsed.data.householdId, userId },
      },
    });
    if (!membership) {
      return NextResponse.json({ error: "Invalid household" }, { status: 400 });
    }
  }

  const updated = await prisma.transaction.update({
    where: { id },
    data: parsed.data,
    include: { category: true },
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
  const transaction = await prisma.transaction.findUnique({ where: { id } });
  if (!transaction || transaction.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.transaction.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
