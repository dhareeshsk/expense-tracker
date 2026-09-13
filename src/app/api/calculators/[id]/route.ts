import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/current-user";

const updateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const calculator = await prisma.calculator.findUnique({ where: { id } });
  if (!calculator || calculator.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(calculator);
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
  const calculator = await prisma.calculator.findUnique({ where: { id } });
  if (!calculator || calculator.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const updated = await prisma.calculator.update({
    where: { id },
    data: parsed.data as { name?: string; data?: Prisma.InputJsonValue },
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
  const calculator = await prisma.calculator.findUnique({ where: { id } });
  if (!calculator || calculator.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.calculator.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
