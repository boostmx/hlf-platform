CREATE TABLE "HiddenTicker" (
    "userId"   TEXT NOT NULL,
    "tickerId" TEXT NOT NULL,

    CONSTRAINT "HiddenTicker_pkey" PRIMARY KEY ("userId", "tickerId")
);

ALTER TABLE "HiddenTicker" ADD CONSTRAINT "HiddenTicker_userId_fkey"
    FOREIGN KEY ("userId")   REFERENCES "User"("id")   ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HiddenTicker" ADD CONSTRAINT "HiddenTicker_tickerId_fkey"
    FOREIGN KEY ("tickerId") REFERENCES "Ticker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
