import { createClient } from "@alpacahq/typescript-sdk";

let _client: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (!_client) {
    _client = createClient({
      key: process.env.ALPACA_API_KEY,
      secret: process.env.ALPACA_SECRET_KEY,
      baseURL: "https://data.alpaca.markets",
    });
  }
  return _client;
}

export interface DailyBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function fetchDailyBars(
  symbol: string,
  startDate: string,
  endDate: string,
): Promise<DailyBar[]> {
  const client = getClient();

  const response = await client.getStocksBars({
    symbols: symbol,
    timeframe: "1Day",
    start: startDate,
    end: endDate,
    limit: 1000,
    feed: "iex",
  });

  const bars = response.bars?.[symbol] ?? [];
  return bars.map((bar) => ({
    date: bar.t.slice(0, 10),
    open: bar.o,
    high: bar.h,
    low: bar.l,
    close: bar.c,
    volume: bar.v,
  }));
}

export async function fetchLatestQuote(symbol: string): Promise<{ price: number } | null> {
  const client = getClient();

  try {
    const response = await client.getStocksBarsLatest({ symbols: symbol, feed: "iex" });
    const bar = response.bars?.[symbol];
    if (!bar) return null;
    return { price: bar.c };
  } catch {
    return null;
  }
}
