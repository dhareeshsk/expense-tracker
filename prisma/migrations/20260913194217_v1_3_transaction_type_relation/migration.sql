-- v1.3 §18: migrate Transaction.type from a fixed enum to a per-user
-- TransactionType relation. Safe expand/backfill/contract sequence:
--   1. Mirror the enum value as plain text so it survives the enum drop.
--   2. Drop the enum column + type (frees up the "TransactionType" name,
--      which collides with the new table if created first).
--   3. Create TransactionType and seed the 3 defaults for every existing user.
--   4. Add transactionTypeId, backfill it from the mirrored text + userId,
--      then make it required and add the FK.

-- Step 1: mirror enum value as text before it's dropped
ALTER TABLE "Transaction" ADD COLUMN "typeText" TEXT;
UPDATE "Transaction" SET "typeText" = "type"::text;
ALTER TABLE "Transaction" ALTER COLUMN "typeText" SET NOT NULL;

-- Step 2: drop the old enum column + type
ALTER TABLE "Transaction" DROP COLUMN "type";
DROP TYPE "TransactionType";

-- Step 3: create the new table and seed defaults per existing user
CREATE TABLE "TransactionType" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TransactionType_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TransactionType_userId_name_key" ON "TransactionType"("userId", "name");

ALTER TABLE "TransactionType" ADD CONSTRAINT "TransactionType_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "TransactionType" ("id", "userId", "name", "icon", "isDefault")
SELECT
    substr(md5(random()::text || clock_timestamp()::text || u.id || defaults.name), 1, 25),
    u.id,
    defaults.name,
    defaults.icon,
    true
FROM "User" u
CROSS JOIN (
    VALUES
        ('Income', 'trending-up'),
        ('Expense', 'trending-down'),
        ('Investment', 'line-chart')
) AS defaults(name, icon);

-- Step 4: add the FK column, backfill from the mirrored text, then require it
ALTER TABLE "Transaction" ADD COLUMN "transactionTypeId" TEXT;

UPDATE "Transaction" tx
SET "transactionTypeId" = tt."id"
FROM "TransactionType" tt
WHERE tt."userId" = tx."userId"
  AND tt."name" = CASE tx."typeText"
      WHEN 'income' THEN 'Income'
      WHEN 'expense' THEN 'Expense'
      WHEN 'investment' THEN 'Investment'
  END;

ALTER TABLE "Transaction" ALTER COLUMN "transactionTypeId" SET NOT NULL;
ALTER TABLE "Transaction" DROP COLUMN "typeText";

CREATE INDEX "Transaction_transactionTypeId_idx" ON "Transaction"("transactionTypeId");

ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_transactionTypeId_fkey"
    FOREIGN KEY ("transactionTypeId") REFERENCES "TransactionType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
