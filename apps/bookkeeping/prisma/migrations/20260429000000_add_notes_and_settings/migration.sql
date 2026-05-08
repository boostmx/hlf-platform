-- CreateTable: monthly notes per user per month
CREATE TABLE "BookkeepingMonthNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookkeepingMonthNote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BookkeepingMonthNote_userId_yearMonth_key" ON "BookkeepingMonthNote"("userId", "yearMonth");
CREATE INDEX "BookkeepingMonthNote_userId_idx" ON "BookkeepingMonthNote"("userId");

ALTER TABLE "BookkeepingMonthNote" ADD CONSTRAINT "BookkeepingMonthNote_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: per-user settings (portfolio filter for trading integration)
CREATE TABLE "BookkeepingSettings" (
    "userId" TEXT NOT NULL,
    "tradingPortfolios" TEXT NOT NULL DEFAULT 'all',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookkeepingSettings_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "BookkeepingSettings" ADD CONSTRAINT "BookkeepingSettings_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
