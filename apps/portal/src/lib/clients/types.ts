// Shapes returned by each app's /api/internal/v1/portal-summary endpoint.

export type WheelSummary = {
  openTradeCount: number;
  openLotCount: number;
  mtdRealizedPnl: number;
  ytdRealizedPnl: number;
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

export type RecentAlert = {
  id: string;
  ticker: string;
  type: string;
  message: string;
  sentAt: string;
};

export type AlertsSummary = {
  alertsToday: number;
  alertsThisWeek: number;
  recentAlerts: RecentAlert[];
};

export type PortalSummary = {
  wheel: WheelSummary | null;
  bookkeeping: BookkeepingSummary | null;
  budget: BudgetSummary | null;
  alerts: AlertsSummary | null;
  errors: {
    wheel?: string;
    bookkeeping?: string;
    budget?: string;
    alerts?: string;
  };
};
