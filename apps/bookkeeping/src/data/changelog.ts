export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  highlights: string[];
  notes?: string;
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "v1.2.1",
    date: "2026-05-08",
    title: "Monorepo Migration",
    highlights: [
      "Moved to the HLF Platform monorepo — all three HLF apps now live in a single codebase, share a common component library, and deploy from one place. No changes to features or data.",
    ],
  },
  {
    version: "v1.2.0",
    date: "2026-05-07",
    title: "HLF Platform Integration",
    highlights: [
      "Trading P&L now pulls from the Wheel Tracker via a secure internal API instead of a shared database connection — a cleaner, more resilient integration that works across independently deployed apps.",
      "Portfolio filter in Settings now loads your actual portfolios directly from the Wheel Tracker, so new portfolios appear automatically without any manual setup.",
      "Dashboard now handles Wheel Tracker connectivity issues gracefully — if the integration is temporarily unavailable, the rest of your bookkeeping data still loads normally.",
    ],
  },
  {
    version: "v1.1.0",
    date: "2026-04-29",
    title: "Copy Entries, Annual Report & Tax Updates",
    highlights: [
      "Copy button on every entry — hover any row in the Transactions tab or Records ledger to copy it into a new entry pre-filled with the same fields and today's date. Works on recurring entries too, so you can duplicate a subscription or recurring income line without re-entering everything.",
      "Download Report replaces Export CSV — the new button generates a full annual CSV report for the selected year: year summary (Trading P&L, Other Income, Expenses, Net Income), month-by-month table, transactions grouped by month with auto-imported trading P&L rows, and a recurring entries section at the bottom.",
      "Year summary strip in the Records ledger — a compact four-column bar (Trading P&L · Other Income · Expenses · Net Income) now appears below the month list so you can see the year total without switching to the dashboard.",
      "Business Travel added to expense categories — available in the Add Entry modal, all filters, and the annual report.",
      "Tax rules corrected to 1 dependent (was 2 dependents in initial release).",
      "2026 federal tax brackets updated to IRS Rev. Proc. 2025-32 official figures — standard deduction raised to $32,200 (MFJ), child tax credit raised to $2,200 per child (OBBBA), Social Security wage base updated to $184,500, all bracket thresholds corrected.",
      "2025 California standard deduction corrected to $11,412 for MFJ — the initial release used the 2024 value ($10,726).",
      "2026 California brackets, standard deduction ($11,700), and dependent exemption credit ($463) updated to FTB/EDD 2026 published schedules.",
    ],
  },
  {
    version: "v1.0.1",
    date: "2026-04-29",
    title: "P&L Accuracy & Post-Launch Fixes",
    highlights: [
      "Stock lot realized P&L now included in Trading P&L — gains and losses from shares assigned through CSPs and later sold are counted alongside option premiums for accurate totals.",
      "Trading P&L formula now mirrors the wheel tracker exactly: prefers stored premiumCaptured and falls back to contractPrice/closingPrice arithmetic for trades where premiumCaptured is null.",
      "Fixed current-month P&L gap — queries now use year-end as the upper bound so future-dated closed trades (options marked closed ahead of their expiration date) are always included.",
      "Fixed negative trading P&L display — loss months now correctly show red indicators and reduce net income across the dashboard, quarterly strip, Records ledger, and monthly chart.",
      "Fixed portfolio selection in Settings — individual portfolios are now independent checkboxes. Clicking a portfolio when 'All' is selected picks only that portfolio instead of inverting the selection.",
      "Dashboard cleanup — Add Entry and Export CSV removed from the dashboard header. Entries are added from Records; year-level export lives in the Records header.",
      "Records page now has an 'Export [Year]' button in the header — exports all entries for the selected year regardless of which tab is open, making it easy to hand off to a CPA.",
      "Changelog page now shows the correct footer link based on sign-in state.",
    ],
  },
  {
    version: "v1.0.0",
    date: "2026-04-28",
    title: "Initial Release",
    notes: "First release of HLF Bookkeeping — personal finance and trading P&L tracker by HL Financial Strategies.",
    highlights: [
      "Dashboard with four KPI cards: Trading P&L, Other Income, Expenses, and Net Income — all scoped to a selected tax year.",
      "Monthly bar chart showing Income + Trading P&L vs Expenses with current-month callout.",
      "Quarterly P&L strip (Q1–Q4) with net totals and estimated tax due dates for each quarter.",
      "Full-year projection card that extrapolates current-pace net income through December.",
      "Live tax reserve calculator using 2025 federal + California rates (Married Filing Jointly, San Diego) — shows reserve target, effective rate, and quarterly payment.",
      "Records ledger — month-by-month expandable view with per-entry edit, delete, and repeat actions. Monthly notes field auto-saves as you type.",
      "Transactions tab — flat running log of all entries with search, type and category filters, and CSV export.",
      "Tax Estimate tab — detailed federal and CA breakdown including SE tax (Freelance, Consulting, Blog Subscribers), child tax credit, NIIT, and quarterly payment schedule.",
      "Auto-pulled realized trading P&L from the Wheel Trade Tracker — reads closed trades and stock lots from your linked portfolios on the same database.",
      "Portfolio filter in Settings — choose all portfolios or specific ones for the trading P&L integration.",
      "Monthly recurring entries — enter a monthly amount once, automatically counted as ×12 in all yearly totals.",
      "Save & Add Another for fast batch entry without reopening the modal.",
      "Admin-only access — private app restricted to admin accounts; non-admin wheel tracker users see an access-restricted screen.",
      "Monthly notes per month in the Records ledger — auto-saves as you type.",
      "Dark mode with indigo/violet primary, amber accent — distinct from the Wheel Tracker while sharing HLF brand identity.",
      "Income categories: Trading Profits · Salary · Freelance · Consulting · Blog Subscribers · Other Income.",
      "Expense categories: Trading Loss · Technology & Hardware · Software & Subscriptions · Office Supplies · Home Office & Utilities · Refund / Reversal · Other Expense.",
    ],
  },
];

export function getLatestVersion(): string {
  return CHANGELOG[0]?.version ?? "v1.0.0";
}

export function getChangelogSorted(): ChangelogEntry[] {
  return [...CHANGELOG].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}
