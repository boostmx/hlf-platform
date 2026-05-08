import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchDailyBars } from "@/lib/alpaca";
import { format, subDays } from "date-fns";

// Vercel Cron: runs daily at 4:45pm ET (21:45 UTC) — after market close
// vercel.json: { "crons": [{ "path": "/api/cron/fetch-bars", "schedule": "45 21 * * 1-5" }] }

export const dynamic = "force-dynamic";

function isCronAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tickers = await prisma.ticker.findMany({
    where: { isApproved: true },
    select: { id: true, symbol: true },
  });

  if (tickers.length === 0) {
    return NextResponse.json({ ok: true, fetched: 0 });
  }

  const endDate = format(new Date(), "yyyy-MM-dd");
  const startDate = format(subDays(new Date(), 220), "yyyy-MM-dd"); // 220 days covers 200 SMA

  let totalBars = 0;
  const errors: string[] = [];

  for (const ticker of tickers) {
    try {
      const bars = await fetchDailyBars(ticker.symbol, startDate, endDate);

      for (const bar of bars) {
        await prisma.priceBar.upsert({
          where: { tickerId_date: { tickerId: ticker.id, date: new Date(bar.date + "T00:00:00Z") } },
          update: { open: bar.open, high: bar.high, low: bar.low, close: bar.close, volume: bar.volume },
          create: {
            tickerId: ticker.id,
            date: new Date(bar.date + "T00:00:00Z"),
            open: bar.open,
            high: bar.high,
            low: bar.low,
            close: bar.close,
            volume: BigInt(Math.round(bar.volume)),
          },
        });
      }

      // Update lastPrice on ticker
      const latest = bars[bars.length - 1];
      if (latest) {
        await prisma.ticker.update({
          where: { id: ticker.id },
          data: { lastPrice: latest.close, lastUpdated: new Date() },
        });
      }

      totalBars += bars.length;
    } catch (err) {
      errors.push(`${ticker.symbol}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({ ok: true, fetched: totalBars, tickers: tickers.length, errors });
}
