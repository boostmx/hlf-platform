import { createClient } from "@alpacahq/typescript-sdk";

// Realtime alerts pull spot quotes from Alpaca's latest-bar REST endpoint.
// IEX feed (free tier) — sufficient for wheel-strategy timeframes.

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

export interface Quote {
  symbol: string;
  price: number;
}

// Batch-fetch latest quotes. Alpaca accepts comma-separated symbols on the
// /bars/latest endpoint, so we hit it once for the whole set.
export async function getLatestQuotes(symbols: string[]): Promise<Map<string, number>> {
  const uniq = Array.from(new Set(symbols.map((s) => s.toUpperCase().trim()))).filter(Boolean);
  if (uniq.length === 0) return new Map();

  const client = getClient();
  try {
    const response = await client.getStocksBarsLatest({
      symbols: uniq.join(","),
      feed: "iex",
    });
    const out = new Map<string, number>();
    for (const symbol of uniq) {
      const bar = response.bars?.[symbol];
      if (bar?.c !== undefined) out.set(symbol, bar.c);
    }
    return out;
  } catch (err) {
    console.error("[alpaca] getLatestQuotes failed:", err);
    return new Map();
  }
}
