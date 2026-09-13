import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nextDueDate } from "@/lib/recurrence";
import { createNotification, hasRecentNotification } from "@/lib/notifications";

// Runs daily via Vercel Cron (see vercel.json). Vercel automatically sends
// `Authorization: Bearer $CRON_SECRET` on cron-triggered requests once
// CRON_SECRET is set as a project env var, so this doubles as auth.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  // §14: flip overdue PENDING reminders to MISSED, spawn the next occurrence
  // for any that recur, and notify. "Overdue" means the due date's calendar
  // day has fully passed (< todayStart) — not just chronologically before
  // the exact current instant, since due dates are stored as midnight and a
  // reminder due "today" must stay visible as due-today, not MISSED, until
  // the day is actually over.
  const overdue = await prisma.reminder.findMany({
    where: { status: "PENDING", dueDate: { lt: todayStart } },
  });

  for (const reminder of overdue) {
    await prisma.reminder.update({
      where: { id: reminder.id },
      data: { status: "MISSED" },
    });

    if (reminder.isRecurring && reminder.recurrenceInterval) {
      await prisma.reminder.create({
        data: {
          userId: reminder.userId,
          label: reminder.label,
          category: reminder.category,
          amount: reminder.amount,
          dueDate: nextDueDate(
            reminder.dueDate,
            reminder.recurrenceInterval,
            reminder.customIntervalDays,
          ),
          isRecurring: true,
          recurrenceInterval: reminder.recurrenceInterval,
          customIntervalDays: reminder.customIntervalDays,
        },
      });
    }

    await createNotification({
      userId: reminder.userId,
      type: "reminder",
      message: `${reminder.label} is now overdue (₹${Number(reminder.amount).toLocaleString("en-IN")})`,
      relatedId: reminder.id,
      pushUrl: "/reminders",
    });
  }

  // §17: reminders due today, not yet overdue — notify once per day.
  const dueToday = await prisma.reminder.findMany({
    where: { status: "PENDING", dueDate: { gte: todayStart, lt: todayEnd } },
  });
  for (const reminder of dueToday) {
    if (await hasRecentNotification("reminder", reminder.id, todayStart)) continue;
    await createNotification({
      userId: reminder.userId,
      type: "reminder",
      message: `${reminder.label} is due today (₹${Number(reminder.amount).toLocaleString("en-IN")})`,
      relatedId: reminder.id,
      pushUrl: "/reminders",
    });
  }

  // §17: budget threshold alerts — check every budget's spend-to-date for the
  // current month, notify once per month per budget while still over threshold.
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const budgets = await prisma.budget.findMany({ include: { category: true } });
  const spendByCategory = await prisma.transaction.groupBy({
    by: ["userId", "categoryId"],
    where: { transactionType: { name: "Expense" }, date: { gte: monthStart, lt: monthEnd } },
    _sum: { amount: true },
  });
  const spendMap = new Map(
    spendByCategory.map((row) => [`${row.userId}:${row.categoryId}`, Number(row._sum.amount ?? 0)]),
  );

  let budgetAlertsSent = 0;
  for (const budget of budgets) {
    const spent = spendMap.get(`${budget.userId}:${budget.categoryId}`) ?? 0;
    const limit = Number(budget.monthlyLimit);
    const ratio = limit > 0 ? (spent / limit) * 100 : 0;
    if (ratio < budget.alertThreshold) continue;
    if (await hasRecentNotification("budget_alert", budget.id, monthStart)) continue;

    await createNotification({
      userId: budget.userId,
      type: "budget_alert",
      message:
        ratio >= 100
          ? `You're over budget on ${budget.category.name} (₹${spent.toLocaleString("en-IN")} of ₹${limit.toLocaleString("en-IN")})`
          : `You're at ${Math.round(ratio)}% of your ${budget.category.name} budget`,
      relatedId: budget.id,
      pushUrl: "/budgets",
    });
    budgetAlertsSent++;
  }

  return NextResponse.json({
    ok: true,
    ranAt: now.toISOString(),
    remindersFlippedToMissed: overdue.length,
    reminderDueTodayNotifications: dueToday.length,
    budgetAlertsSent,
  });
}
