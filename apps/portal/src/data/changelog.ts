export interface ChangelogEntry {
  date: string;
  version?: string;
  highlights: string[];
}

export const changelog: ChangelogEntry[] = [
  {
    date: "2026-05-11",
    version: "v0.1.0",
    highlights: [
      "Initial release — HLF Portal as the signed-in landing page across the suite.",
      "App launcher grid linking to Wheel Tracker, Bookkeeping, Budget Tracker, and Stock Alerts.",
      "Cross-app KPI strip — open positions, MTD trading P&L, MTD net, budget remaining, FIRE %, unread alerts.",
      "Alerts inbox surfacing recent signals from Stock Alerts.",
      "SSO via @hlf/auth-db — sign in once, signed in everywhere.",
    ],
  },
];

export function getChangelogSorted(): ChangelogEntry[] {
  return [...changelog].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export function getLatestVersion(): string {
  const sorted = getChangelogSorted();
  return sorted[0]?.version ?? "v0.0.0";
}
