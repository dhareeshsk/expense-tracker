-- CreateEnum
CREATE TYPE "CalculatorType" AS ENUM ('EXPENSE_SPLIT', 'BUDGET');

-- CreateTable
CREATE TABLE "Calculator" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "CalculatorType" NOT NULL,
    "name" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Calculator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Calculator_userId_type_idx" ON "Calculator"("userId", "type");

-- AddForeignKey
ALTER TABLE "Calculator" ADD CONSTRAINT "Calculator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
