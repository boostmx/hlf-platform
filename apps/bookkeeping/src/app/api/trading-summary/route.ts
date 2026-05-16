import { NextRequest, NextResponse } from "next/server";
import { authPrisma } from "@hlf/auth-db";
import { requireAdmin } from "@/server/auth/requireAdmin";
import { fetchWheelClosedTrades } from "@/lib/wheel-tracker-client";

function monthKey(isoString: string): string {
  return isoString.slice(0, 7); // "YYYY-MM"
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to");

  // tradingPortfolios is the shared per-user setting on @hlf/auth-db's User
  // table. Legacy BookkeepingSettings.tradingPortfolios column is no longer
  // read here.
  const sharedUser = await authPrisma.user.findUnique({
    where: { id: auth.userId },
    select: { tradingPortfolios: true },
  });

  const selectedPortfolioIds =
    sharedUser?.tradingPortfolios && sharedUser.tradingPortfolios !== "all"
      ? sharedUser.tradingPortfolios.split(",").filter(Boolean)
      : undefined;

  // Extend 'to' to end of day — wheel tracker pre-dates trades to expiry date
  const toExtended = to ? `${to}T23:59:59.999Z` : undefined;

  try {
    const { trades, stockLots } = await fetchWheelClosedTrades({
      userId: auth.userId,
      from,
      to: toExtended,
      portfolioIds: selectedPortfolioIds,
    });

    const byMonth: Record<string, number> = {};

    for (const t of trades) {
      if (!t.closedAt) continue;
      const k = monthKey(t.closedAt);
      byMonth[k] = (byMonth[k] ?? 0) + (t.premiumCaptured ?? 0);
    }

    for (const lot of stockLots) {
      if (!lot.closedAt) continue;
      const k = monthKey(lot.closedAt);
      byMonth[k] = (byMonth[k] ?? 0) + (lot.realizedPnl ?? 0);
    }

    const tradePL = trades.reduce((sum, t) => sum + (t.premiumCaptured ?? 0), 0);
    const stockLotPL = stockLots.reduce((sum, l) => sum + (l.realizedPnl ?? 0), 0);
    const totalPremium = tradePL + stockLotPL;
    const tradeCount = trades.length + stockLots.length;

    return NextResponse.json({ totalPremium, tradeCount, byMonth });
  } catch (err) {
    console.error("[trading-summary] wheel-tracker API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch trading data from Wheel Tracker" },
      { status: 502 },
    );
  }
}
