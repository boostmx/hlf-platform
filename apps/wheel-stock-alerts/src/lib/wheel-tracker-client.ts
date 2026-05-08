// Typed client for wheel-strat-tracker's internal API.
// Set WHEEL_TRACKER_URL and INTERNAL_API_KEY in env to enable.
// hlf-wheel-alerts uses email-based lookup because it runs on a separate DB.


export type WheelOpenTrade = {
  id: string;
  ticker: string;
  type: string; // "CSP" | "CC"
  strikePrice: number;
  expirationDate: string;
  contracts: number;
  contractsOpen: number;
  contractsInitial: number;
  contractPrice: number;
  entryPrice: number | null;
  portfolioId: string;
  portfolioName: string;
  stockLotId: string | null;
  createdAt: string;
};

export type WheelOpenStockLot = {
  id: string;
  ticker: string;
  shares: number;
  avgCost: number;
  portfolioId: string;
  portfolioName: string;
  openedAt: string;
};

export type WheelOpenPositions = {
  trades: WheelOpenTrade[];
  stockLots: WheelOpenStockLot[];
};

export type WheelPortfolio = {
  id: string;
  name: string;
};

function headers() {
  return { Authorization: `Bearer ${process.env.INTERNAL_API_KEY ?? ""}` };
}

function baseUrl() {
  const url = process.env.WHEEL_TRACKER_URL;
  if (!url) throw new Error("WHEEL_TRACKER_URL is not configured");
  return url;
}

export function isWheelTrackerConfigured(): boolean {
  return Boolean(process.env.WHEEL_TRACKER_URL && process.env.INTERNAL_API_KEY);
}

export async function fetchWheelPortfolios(email: string): Promise<WheelPortfolio[]> {
  const url = new URL(`${baseUrl()}/api/internal/v1/portfolios`);
  url.searchParams.set("email", email);

  const res = await fetch(url.toString(), {
    headers: headers(),
    cache: "no-store",
  });

  if (!res.ok) return [];

  const body = (await res.json()) as { data: WheelPortfolio[] };
  return body.data ?? [];
}

export async function fetchWheelOpenPositions(email: string): Promise<WheelOpenPositions> {
  const url = new URL(`${baseUrl()}/api/internal/v1/open-positions`);
  url.searchParams.set("email", email);

  const res = await fetch(url.toString(), {
    headers: headers(),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Wheel Tracker open-positions failed: ${res.status}`);
  }

  const body = (await res.json()) as { data: WheelOpenPositions };
  return body.data;
}
