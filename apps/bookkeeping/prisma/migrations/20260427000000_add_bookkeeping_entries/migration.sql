-- CreateEnum
CREATE TYPE "EntryType" AS ENUM ('income', 'expense');

-- CreateEnum
CREATE TYPE "EntrySource" AS ENUM ('manual', 'trading');

-- CreateTable
CREATE TABLE "BookkeepingEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "EntryType" NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "source" "EntrySource" NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookkeepingEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookkeepingEntry_userId_date_idx" ON "BookkeepingEntry"("userId", "date");

-- CreateIndex
CREATE INDEX "BookkeepingEntry_userId_type_date_idx" ON "BookkeepingEntry"("userId", "type", "date");

-- AddForeignKey
ALTER TABLE "BookkeepingEntry" ADD CONSTRAINT "BookkeepingEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
