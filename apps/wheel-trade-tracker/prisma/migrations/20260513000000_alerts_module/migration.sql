-- Alerts module: realtime position-aware Web Push alerts.
-- Replaces the deprecated stock-alerts app (no data carried over).

-- CreateEnum
CREATE TYPE "AlertConfigType" AS ENUM (
    'PROFIT_TARGET',
    'ASSIGNMENT_RISK',
    'ROLL_OPPORTUNITY',
    'WATCHLIST_BREACH'
);

-- CreateTable
CREATE TABLE "UserAlertPreferences" (
    "userId" TEXT NOT NULL,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "emailAddress" TEXT,
    "quietHoursStart" INTEGER,
    "quietHoursEnd" INTEGER,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAlertPreferences_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "AlertConfigType" NOT NULL,
    "tradeId" TEXT,
    "watchlistTicker" TEXT,
    "params" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastFiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertEvent" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "priceAtFire" DOUBLE PRECISION NOT NULL,
    "pushDelivered" BOOLEAN NOT NULL DEFAULT false,
    "emailDelivered" BOOLEAN NOT NULL DEFAULT false,
    "firedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE INDEX "AlertConfig_userId_enabled_idx" ON "AlertConfig"("userId", "enabled");

-- CreateIndex
CREATE INDEX "AlertConfig_tradeId_idx" ON "AlertConfig"("tradeId");

-- CreateIndex
CREATE INDEX "AlertConfig_userId_watchlistTicker_idx" ON "AlertConfig"("userId", "watchlistTicker");

-- CreateIndex
CREATE INDEX "AlertEvent_userId_firedAt_idx" ON "AlertEvent"("userId", "firedAt");

-- CreateIndex
CREATE INDEX "AlertEvent_configId_idx" ON "AlertEvent"("configId");

-- AddForeignKey
ALTER TABLE "AlertEvent" ADD CONSTRAINT "AlertEvent_configId_fkey" FOREIGN KEY ("configId") REFERENCES "AlertConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
