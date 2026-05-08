// Typed client for wheel-strat-tracker's internal API.
// Set WHEEL_TRACKER_URL and INTERNAL_API_KEY in env to enable.

export type WheelClosedTrade = {
  id: string;
  ticker: string;
  type: string;
  strikePrice: number;
  expirationDate: string;
  contracts: number;
  contractsInitial: number;
  contractPrice: number;
  closedAt: string | null;
  closingPrice: number | null;
  premiumCaptured: number | null;
  percentPL: number | null;
  closeReason: string | null;
  portfolioId: string;
  portfolioName: string;
  createdAt: string;
};

export type WheelClosedStockLot = {
  id: string;
  ticker: string;
  shares: number;
  avgCost: number;
  closePrice: number | null;
  realizedPnl: number | null;
  openedAt: string;
  closedAt: string | null;
  portfolioId: string;
  portfolioName: string;
};

export type WheelClosedTradesData = {
  trades: WheelClosedTrade[];
  stockLots: WheelClosedStockLot[];
};

function headers() {
  return { Authorization: `Bearer ${process.env.INTERNAL_API_KEY ?? ""}` };
}

function baseUrl() {
  const url = process.env.WHEEL_TRACKER_URL;
  if (!url) throw new Error("WHEEL_TRACKER_URL is not configured");
  return url;
}

export type WheelPortfolio = {
  id: string;
  name: string;
};

export async function fetchWheelPortfolios(userId: string): Promise<WheelPortfolio[]> {
  const url = new URL(`${baseUrl()}/api/internal/v1/portfolios`);
  url.searchParams.set("userId", userId);

  const res = await fetch(url.toString(), {
    headers: headers(),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Wheel Tracker portfolios failed: ${res.status}`);
  }

  const body = (await res.json()) as { data: WheelPortfolio[] };
  return body.data;
}

export async function fetchWheelClosedTrades(params: {
  userId: string;
  from?: string;
  to?: string;
  portfolioIds?: string[];
}): Promise<WheelClosedTradesData> {
  const url = new URL(`${baseUrl()}/api/internal/v1/closed-trades`);
  url.searchParams.set("userId", params.userId);
  if (params.from) url.searchParams.set("from", params.from);
  if (params.to) url.searchParams.set("to", params.to);
  if (params.portfolioIds?.length) {
    url.searchParams.set("portfolioIds", params.portfolioIds.join(","));
  }

  const res = await fetch(url.toString(), {
    headers: headers(),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Wheel Tracker closed-trades failed: ${res.status}`);
  }

  const body = (await res.json()) as { data: WheelClosedTradesData };
  return body.data;
}
