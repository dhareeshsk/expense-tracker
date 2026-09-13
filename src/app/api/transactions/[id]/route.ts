import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/current-user";

const transactionSchema = z.object({
  transactionTypeId: z.string().min(1, "Transaction type is required").optional(),
  amount: z
    .number({ error: "Amount is required" })
    .positive("Amount must be greater than 0")
    .finite("Amount must be a valid number")
    .optional(),
  categoryId: z.string().min(1, "Category is required").optional(),
  date: z.coerce.date({ error: "Date is required" }).optional(),
  note: z.string().trim().max(500).optional().nullable(),
  paymentMethod: z
    .string()
    .trim()
    .min(1, "Payment method is required")
    .max(50, "Payment method must be 50 characters or fewer")
    .optional(),
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

  if (parsed.data.transactionTypeId) {
    const transactionType = await prisma.transactionType.findUnique({
      where: { id: parsed.data.transactionTypeId },
    });
    if (!transactionType || transactionType.userId !== userId) {
      return NextResponse.json({ error: "Invalid transaction type" }, { status: 400 });
    }
  }

  const updated = await prisma.transaction.update({
    where: { id },
    data: parsed.data,
    include: { category: true, transactionType: true },
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
