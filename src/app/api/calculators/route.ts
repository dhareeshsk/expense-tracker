import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/current-user";

const calculatorSchema = z.object({
  type: z.enum(["EXPENSE_SPLIT", "BUDGET"]),
  name: z.string().trim().min(1, "Name is required").max(100),
  data: z.record(z.string(), z.unknown()),
});

export async function GET(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  const calculators = await prisma.calculator.findMany({
    where: {
      userId,
      ...(type === "EXPENSE_SPLIT" || type === "BUDGET" ? { type } : {}),
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(calculators);
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = calculatorSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const calculator = await prisma.calculator.create({
    data: {
      userId,
      type: parsed.data.type,
      name: parsed.data.name,
      data: parsed.data.data as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json(calculator, { status: 201 });
}
