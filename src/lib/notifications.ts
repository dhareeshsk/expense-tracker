import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";

export type NotificationType = "household" | "budget_alert" | "reminder";

export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  message: string;
  relatedId?: string;
  pushUrl?: string;
}) {
  const notification = await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      message: params.message,
      relatedId: params.relatedId,
    },
  });

  // Best-effort — a push delivery failure (expired subscription, no
  // subscription, VAPID not configured) must never block the caller.
  sendPushToUser(params.userId, {
    title: "ExpenseTrack",
    body: params.message,
    url: params.pushUrl ?? "/",
  }).catch(() => {});

  return notification;
}

/** Has this exact (type, relatedId) already been notified since `since`? Used to avoid re-notifying on every cron run for a condition that hasn't changed (e.g. a budget still over threshold). */
export async function hasRecentNotification(
  type: NotificationType,
  relatedId: string,
  since: Date,
) {
  const existing = await prisma.notification.findFirst({
    where: { type, relatedId, createdAt: { gte: since } },
    select: { id: true },
  });
  return Boolean(existing);
}
