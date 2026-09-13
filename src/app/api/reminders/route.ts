import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/current-user";

const reminderSchema = z
  .object({
    label: z.string().trim().min(1, "Label is required").max(100),
    category: z.string().trim().min(1, "Category is required").max(50),
    amount: z
      .number({ error: "Amount is required" })
      .positive("Amount must be greater than 0")
      .finite("Amount must be a valid number"),
    dueDate: z.coerce.date({ error: "Due date is required" }),
    isRecurring: z.boolean().default(false),
    recurrenceInterval: z.enum(["WEEKLY", "MONTHLY", "CUSTOM_DAYS"]).optional().nullable(),
    customIntervalDays: z.number().int().positive().optional().nullable(),
  })
  .refine((val) => !val.isRecurring || val.recurrenceInterval, {
    message: "Choose a recurrence interval for a recurring reminder",
    path: ["recurrenceInterval"],
  })
  .refine(
    (val) => val.recurrenceInterval !== "CUSTOM_DAYS" || (val.customIntervalDays ?? 0) > 0,
    { message: "Enter how many days between repeats", path: ["customIntervalDays"] },
  );

export async function GET(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 20));

  const where = {
    userId,
    ...(status === "PENDING" || status === "PAID" || status === "MISSED"
      ? { status: status as "PENDING" | "PAID" | "MISSED" }
      : {}),
  };

  const [reminders, total] = await Promise.all([
    prisma.reminder.findMany({
      where,
      orderBy: { dueDate: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.reminder.count({ where }),
  ]);

  return NextResponse.json({
    reminders,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = reminderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const reminder = await prisma.reminder.create({
    data: {
      userId,
      label: parsed.data.label,
      category: parsed.data.category,
      amount: parsed.data.amount,
      dueDate: parsed.data.dueDate,
      isRecurring: parsed.data.isRecurring,
      recurrenceInterval: parsed.data.isRecurring ? parsed.data.recurrenceInterval : null,
      customIntervalDays:
        parsed.data.isRecurring && parsed.data.recurrenceInterval === "CUSTOM_DAYS"
          ? parsed.data.customIntervalDays
          : null,
    },
  });

  return NextResponse.json(reminder, { status: 201 });
}
