-- Extend AlertType enum with position-aware alert types
ALTER TYPE "AlertType" ADD VALUE IF NOT EXISTS 'PROFIT_TARGET';
ALTER TYPE "AlertType" ADD VALUE IF NOT EXISTS 'ASSIGNMENT_RISK';
ALTER TYPE "AlertType" ADD VALUE IF NOT EXISTS 'ROLL_OPPORTUNITY';

-- Create PositionType enum
CREATE TYPE "PositionType" AS ENUM ('CSP', 'CC', 'STOCK');

-- Create UserPosition table
CREATE TABLE "UserPosition" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tickerId" TEXT NOT NULL,
    "positionType" "PositionType" NOT NULL,
    "contracts" INTEGER NOT NULL DEFAULT 1,
    "strikePrice" DOUBLE PRECISION,
    "premium" DOUBLE PRECISION,
    "shares" INTEGER,
    "entryPrice" DOUBLE PRECISION,
    "expirationDate" TIMESTAMP(3),
    "notes" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "UserPosition_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserPosition_userId_tickerId_idx" ON "UserPosition"("userId", "tickerId");
CREATE INDEX "UserPosition_userId_closedAt_idx" ON "UserPosition"("userId", "closedAt");

ALTER TABLE "UserPosition" ADD CONSTRAINT "UserPosition_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserPosition" ADD CONSTRAINT "UserPosition_tickerId_fkey"
    FOREIGN KEY ("tickerId") REFERENCES "Ticker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
