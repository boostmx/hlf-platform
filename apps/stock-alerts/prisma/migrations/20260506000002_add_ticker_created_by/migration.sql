-- Add createdBy to Ticker for user-specific tickers
-- NULL = global (admin-curated wheel universe)
-- userId = visible only to that user

ALTER TABLE "Ticker" ADD COLUMN "createdBy" TEXT;

ALTER TABLE "Ticker" ADD CONSTRAINT "Ticker_createdBy_fkey"
  FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Ticker_createdBy_idx" ON "Ticker"("createdBy");
