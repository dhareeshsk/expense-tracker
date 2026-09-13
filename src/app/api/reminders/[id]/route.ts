import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/current-user";
import { nextDueDate } from "@/lib/recurrence";

const updateSchema = z
  .object({
    label: z.string().trim().min(1, "Label is required").max(100).optional(),
    category: z.string().trim().min(1, "Category is required").max(50).optional(),
    amount: z
      .number({ error: "Amount is required" })
      .positive("Amount must be greater than 0")
      .finite("Amount must be a valid number")
      .optional(),
    dueDate: z.coerce.date({ error: "Due date is required" }).optional(),
    status: z.enum(["PENDING", "PAID", "MISSED"]).optional(),
    isRecurring: z.boolean().optional(),
    recurrenceInterval: z.enum(["WEEKLY", "MONTHLY", "CUSTOM_DAYS"]).optional().nullable(),
    customIntervalDays: z.number().int().positive().optional().nullable(),
  })
  .refine((val) => !val.isRecurring || val.recurrenceInterval, {
    message: "Choose a recurrence interval for a recurring reminder",
    path: ["recurrenceInterval"],
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
  const reminder = await prisma.reminder.findUnique({ where: { id } });
  if (!reminder || reminder.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const wasActiveBefore = reminder.status === "PENDING";
  const becomingResolved =
    parsed.data.status === "PAID" || parsed.data.status === "MISSED";

  const updated = await prisma.reminder.update({
    where: { id },
    data: parsed.data,
  });

  // Generate the next occurrence the moment a recurring reminder is resolved
  // (marked PAID here, or MISSED via the daily cron sweep).
  if (wasActiveBefore && becomingResolved && updated.isRecurring && updated.recurrenceInterval) {
    await prisma.reminder.create({
      data: {
        userId,
        label: updated.label,
        category: updated.category,
        amount: updated.amount,
        dueDate: nextDueDate(updated.dueDate, updated.recurrenceInterval, updated.customIntervalDays),
        isRecurring: true,
        recurrenceInterval: updated.recurrenceInterval,
        customIntervalDays: updated.customIntervalDays,
      },
    });
  }

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
  const reminder = await prisma.reminder.findUnique({ where: { id } });
  if (!reminder || reminder.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.reminder.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
