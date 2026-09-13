-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('PENDING', 'PAID', 'MISSED');

-- CreateEnum
CREATE TYPE "RecurrenceInterval" AS ENUM ('WEEKLY', 'MONTHLY', 'CUSTOM_DAYS');

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceInterval" "RecurrenceInterval",
    "customIntervalDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Reminder_userId_dueDate_idx" ON "Reminder"("userId", "dueDate");

-- CreateIndex
CREATE INDEX "Reminder_status_idx" ON "Reminder"("status");

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
