import type { RecurrenceInterval } from "@prisma/client";

export function nextDueDate(
  current: Date,
  interval: RecurrenceInterval,
  customIntervalDays: number | null,
): Date {
  const next = new Date(current);
  if (interval === "WEEKLY") {
    next.setUTCDate(next.getUTCDate() + 7);
  } else if (interval === "MONTHLY") {
    next.setUTCMonth(next.getUTCMonth() + 1);
  } else {
    next.setUTCDate(next.getUTCDate() + (customIntervalDays ?? 30));
  }
  return next;
}
