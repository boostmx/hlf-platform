// The four HLF apps that the portal links to. URL is resolved at module load
// using literal `process.env.NEXT_PUBLIC_*` access so Next.js inlines the value
// into the client bundle. Dynamic bracket access (process.env[someVar]) is NOT
// inlined and produces SSR/CSR hydration mismatches.

export type AppDef = {
  key: "wheel" | "bookkeeping" | "budget" | "alerts";
  name: string;
  description: string;
  url: string;
  accent: string;
};

export const APPS: AppDef[] = [
  {
    key: "wheel",
    name: "Wheel Tracker",
    description: "Options wheel — trades, lots, P&L",
    url:
      process.env.NEXT_PUBLIC_WHEEL_TRACKER_URL ||
      "https://wheel.hlfinancialstrategies.com",
    accent: "oklch(0.48 0.17 155)",
  },
  {
    key: "bookkeeping",
    name: "Bookkeeping",
    description: "Income, expenses, tax estimates",
    url:
      process.env.NEXT_PUBLIC_BOOKKEEPING_URL ||
      "https://bookkeeping.hlfinancialstrategies.com",
    accent: "oklch(0.46 0.22 265)",
  },
  {
    key: "budget",
    name: "Budget Tracker",
    description: "Monthly budget and FIRE dashboard",
    url:
      process.env.NEXT_PUBLIC_BUDGET_TRACKER_URL ||
      "https://budget.hlfinancialstrategies.com",
    accent: "oklch(0.48 0.18 195)",
  },
  {
    key: "alerts",
    name: "Stock Alerts",
    description: "Daily signals and exit alerts",
    url:
      process.env.NEXT_PUBLIC_STOCK_ALERTS_URL ||
      "https://alerts.hlfinancialstrategies.com",
    accent: "oklch(0.52 0.24 290)",
  },
];

export function getAppUrl(app: AppDef): string {
  return app.url;
}
