import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/current-user";

const budgetUpdateSchema = z.object({
  monthlyLimit: z
    .number({ error: "Monthly limit is required" })
    .positive("Monthly limit must be greater than 0")
    .finite("Monthly limit must be a valid number"),
  alertThreshold: z
    .number({ error: "Alert threshold is required" })
    .int("Alert threshold must be a whole number")
    .min(1, "Alert threshold must be at least 1%")
    .max(200, "Alert threshold must be 200% or less"),
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
  const budget = await prisma.budget.findUnique({ where: { id } });
  if (!budget || budget.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = budgetUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const updated = await prisma.budget.update({
    where: { id },
    data: {
      monthlyLimit: parsed.data.monthlyLimit,
      alertThreshold: parsed.data.alertThreshold,
    },
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
  const budget = await prisma.budget.findUnique({ where: { id } });
  if (!budget || budget.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.budget.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
