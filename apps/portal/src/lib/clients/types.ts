// Shapes returned by each app's /api/internal/v1/portal-summary endpoint.
//
// Wheel Tracker's portal-summary also returns the alerts inbox fields
// (`alertsToday`, `alertsThisWeek`, `recentAlerts`) since the realtime alerts
// module was rebuilt inside wheel-tracker on 2026-05-13. The standalone
// Stock Alerts app was retired.

export type RecentAlert = {
  id: string;
  message: string;
  firedAt: string;
  type: string;
  tradeId: string | null;
  watchlistTicker: string | null;
};

export type WheelSummary = {
  openTradeCount: number;
  openLotCount: number;
  mtdRealizedPnl: number;
  ytdRealizedPnl: number;
  alertsToday: number;
  alertsThisWeek: number;
  recentAlerts: RecentAlert[];
};

export type BookkeepingSummary = {
  mtdNet: number;
  mtdIncome: number;
  mtdExpenses: number;
  ytdNet: number;
};

export type BudgetSummary = {
  mtdSpent: number;
  monthlyBudgetTotal: number;
  remaining: number;
  fireScorePct: number | null;
};

export type PortalSummary = {
  wheel: WheelSummary | null;
  bookkeeping: BookkeepingSummary | null;
  budget: BudgetSummary | null;
  errors: {
    wheel?: string;
    bookkeeping?: string;
    budget?: string;
  };
};
