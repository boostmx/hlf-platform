-- Shared filter for "which wheel-tracker portfolios count toward cross-app
-- trading P&L rollups". Read by the portal and by bookkeeping; wheel-tracker
-- itself ignores it and continues to show all portfolios in its own UI.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "tradingPortfolios" TEXT NOT NULL DEFAULT 'all';
