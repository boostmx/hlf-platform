import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/auth";
import { getIntradayBars } from "@/lib/alpaca";

export const dynamic = "force-dynamic";

export type ChartData = {
  closes: number[];
  timestamps: number[];
};

export type ChartsResponse = Record<string, ChartData>;

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const tickersParam = searchParams.get("tickers") ?? "";
  const tickers = [
    ...new Set(
      tickersParam.split(",").map((t) => t.trim().toUpperCase()).filter(Boolean),
    ),
  ].slice(0, 25);

  if (tickers.length === 0) return NextResponse.json({});

  const series = await getIntradayBars(tickers);
  const map: ChartsResponse = {};
  for (const ticker of tickers) {
    map[ticker] = series.get(ticker) ?? { closes: [], timestamps: [] };
  }

  // 5-minute cache — sparklines don't need 60s freshness
  return NextResponse.json(map, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=120" },
  });
}
