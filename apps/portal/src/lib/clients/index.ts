// Server-side clients for each HLF app's /api/internal/v1/portal-summary endpoint.
// All apps live behind the same INTERNAL_API_KEY bearer token. Each fetcher
// is fire-and-forget — on error it returns null so the portal can still
// render the rest of the dashboard.

import type { BookkeepingSummary, BudgetSummary, WheelSummary } from "./types";

function bearerHeaders() {
  return { Authorization: `Bearer ${process.env.INTERNAL_API_KEY ?? ""}` };
}

async function fetchSummary<T>(
  baseUrlEnv: string,
  appName: string,
  email: string,
  extraParams?: Record<string, string>,
): Promise<{ data: T | null; error?: string }> {
  const base = process.env[baseUrlEnv];
  if (!base) return { data: null, error: `${baseUrlEnv} not configured` };
  if (!process.env.INTERNAL_API_KEY) {
    return { data: null, error: "INTERNAL_API_KEY not configured" };
  }

  const url = new URL(`${base}/api/internal/v1/portal-summary`);
  url.searchParams.set("email", email);
  for (const [k, v] of Object.entries(extraParams ?? {})) {
    url.searchParams.set(k, v);
  }

  try {
    const res = await fetch(url.toString(), {
      headers: bearerHeaders(),
      cache: "no-store",
    });
    if (!res.ok) {
      return { data: null, error: `${appName} responded ${res.status}` };
    }
    const body = (await res.json()) as { data: T };
    return { data: body.data ?? null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : `${appName} fetch failed`,
    };
  }
}

export function fetchWheelSummary(email: string, portfolioIds?: string[]) {
  const extra =
    portfolioIds && portfolioIds.length > 0
      ? { portfolioIds: portfolioIds.join(",") }
      : undefined;
  return fetchSummary<WheelSummary>("WHEEL_TRACKER_URL", "wheel-tracker", email, extra);
}

export function fetchBookkeepingSummary(email: string) {
  return fetchSummary<BookkeepingSummary>("BOOKKEEPING_URL", "bookkeeping", email);
}

export function fetchBudgetSummary(email: string) {
  return fetchSummary<BudgetSummary>("BUDGET_TRACKER_URL", "budget-tracker", email);
}
