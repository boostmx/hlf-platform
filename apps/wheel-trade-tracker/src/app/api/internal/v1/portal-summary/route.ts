import {
  validateInternalApiKey,
  internalResponse,
  internalError,
} from "@/server/api/internal";
import { db } from "@/server/db";
import { authPrisma } from "@hlf/auth-db";

// GET /api/internal/v1/portal-summary?email=  (or ?userId=)
// Shaped for the HLF Portal dashboard — small response, single round-trip.
// Returns: open trade/lot counts, MTD/YTD realized P&L (trades + stock lots),
// and alerts data (now sourced from the alerts module merged in 2026-05-13).
export async function GET(request: Request) {
  if (!validateInternalApiKey(request)) {
    return internalError("Unauthorized", 401);
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const email = searchParams.get("email");

  if (!userId && !email) {
    return internalError("userId or email is required", 400);
  }

  let resolvedUserId = userId;
  if (!resolvedUserId && email) {
    const user = await authPrisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!user) {
      return internalResponse({
        openTradeCount: 0,
        openLotCount: 0,
        mtdRealizedPnl: 0,
        ytdRealizedPnl: 0,
        alertsToday: 0,
        alertsThisWeek: 0,
        recentAlerts: [],
      });
    }
    resolvedUserId = user.id;
  }

  const now = new Date();
  const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const ytdStart = new Date(now.getFullYear(), 0, 1);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const portfolioFilter = { userId: resolvedUserId! };

  try {
    const [
      openTradeCount,
      openLotCount,
      ytdTrades,
      ytdLots,
      alertsToday,
      alertsThisWeek,
      recentAlerts,
    ] = await Promise.all([
      db.trade.count({
        where: { status: "open", portfolio: portfolioFilter },
      }),
      db.stockLot.count({
        where: { status: "OPEN", portfolio: portfolioFilter },
      }),
      db.trade.findMany({
        where: {
          status: "closed",
          portfolio: portfolioFilter,
          closedAt: { gte: ytdStart },
        },
        select: { closedAt: true, premiumCaptured: true },
      }),
      db.stockLot.findMany({
        where: {
          status: "CLOSED",
          portfolio: portfolioFilter,
          closedAt: { gte: ytdStart },
        },
        select: { closedAt: true, realizedPnl: true },
      }),
      db.alertEvent.count({
        where: { userId: resolvedUserId!, firedAt: { gte: todayStart } },
      }),
      db.alertEvent.count({
        where: { userId: resolvedUserId!, firedAt: { gte: weekStart } },
      }),
      db.alertEvent.findMany({
        where: { userId: resolvedUserId! },
        orderBy: { firedAt: "desc" },
        take: 10,
        select: {
          id: true,
          message: true,
          firedAt: true,
          config: {
            select: { type: true, tradeId: true, watchlistTicker: true },
          },
        },
      }),
    ]);

    let mtdRealizedPnl = 0;
    let ytdRealizedPnl = 0;

    for (const t of ytdTrades) {
      const pnl = t.premiumCaptured ?? 0;
      ytdRealizedPnl += pnl;
      if (t.closedAt && t.closedAt >= mtdStart) mtdRealizedPnl += pnl;
    }

    for (const lot of ytdLots) {
      const pnl = Number(lot.realizedPnl ?? 0);
      ytdRealizedPnl += pnl;
      if (lot.closedAt && lot.closedAt >= mtdStart) mtdRealizedPnl += pnl;
    }

    return internalResponse({
      openTradeCount,
      openLotCount,
      mtdRealizedPnl,
      ytdRealizedPnl,
      alertsToday,
      alertsThisWeek,
      recentAlerts: recentAlerts.map((a) => ({
        id: a.id,
        message: a.message,
        firedAt: a.firedAt.toISOString(),
        type: a.config.type,
        tradeId: a.config.tradeId,
        watchlistTicker: a.config.watchlistTicker,
      })),
    });
  } catch (error) {
    console.error("[internal/portal-summary] error:", error);
    return internalError("Internal server error", 500);
  }
}
