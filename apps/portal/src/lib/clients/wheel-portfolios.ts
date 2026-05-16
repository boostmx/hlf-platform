// Server-side client for wheel-tracker's portfolios list. Used to populate
// the trading-portfolios settings UI on the portal.

export type WheelPortfolio = {
  id: string;
  name: string;
};

function bearerHeaders() {
  return { Authorization: `Bearer ${process.env.INTERNAL_API_KEY ?? ""}` };
}

export async function fetchWheelPortfolios(
  userId: string,
): Promise<{ data: WheelPortfolio[] | null; error?: string }> {
  const base = process.env.WHEEL_TRACKER_URL;
  if (!base) return { data: null, error: "WHEEL_TRACKER_URL not configured" };
  if (!process.env.INTERNAL_API_KEY) {
    return { data: null, error: "INTERNAL_API_KEY not configured" };
  }

  const url = new URL(`${base}/api/internal/v1/portfolios`);
  url.searchParams.set("userId", userId);

  try {
    const res = await fetch(url.toString(), {
      headers: bearerHeaders(),
      cache: "no-store",
    });
    if (!res.ok) {
      return { data: null, error: `wheel-tracker responded ${res.status}` };
    }
    const body = (await res.json()) as { data: WheelPortfolio[] };
    return { data: body.data ?? [] };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "wheel-tracker fetch failed",
    };
  }
}
