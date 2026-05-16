import {
  validateInternalApiKey,
  internalResponse,
  internalError,
} from "@/server/api/internal";
import prisma from "@/server/prisma";
import { authPrisma } from "@hlf/auth-db";
import { fetchWheelTradingSummary } from "@/lib/wheel-tracker-client";

// GET /api/internal/v1/portal-summary?email=  (or ?userId=)
// MTD / YTD income & expense net from bookkeeping entries. Recurring entries
// store a monthly amount and contribute to every month regardless of `date`,
// matching how exportCsv and the dashboard render them.
//
// Trading P&L from Wheel Tracker is folded into income — the bookkeeping app's
// own dashboard does the same auto-pull, so the portal summary needs to match
// or "MTD net" looks wrong (e.g. $0 income when there's no manual entry but
// the user has realized trading gains).
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
        mtdNet: 0,
        mtdIncome: 0,
        mtdExpenses: 0,
        ytdNet: 0,
        mtdTradingPnl: 0,
        ytdTradingPnl: 0,
      });
    }
    resolvedUserId = user.id;
  }

  const now = new Date();
  const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const ytdStart = new Date(now.getFullYear(), 0, 1);
  const monthsElapsedYtd = now.getMonth() + 1;

  try {
    // tradingPortfolios is the shared per-user setting on @hlf/auth-db's User
    // table (one source of truth across portal + bookkeeping). The legacy
    // BookkeepingSettings.tradingPortfolios column is no longer read.
    const [entries, sharedUser] = await Promise.all([
      prisma.bookkeepingEntry.findMany({
        where: { userId: resolvedUserId! },
        select: { type: true, amount: true, date: true, recurring: true },
      }),
      authPrisma.user.findUnique({
        where: { id: resolvedUserId! },
        select: { tradingPortfolios: true },
      }),
    ]);

    const selectedPortfolioIds =
      sharedUser?.tradingPortfolios && sharedUser.tradingPortfolios !== "all"
        ? sharedUser.tradingPortfolios.split(",").filter(Boolean)
        : undefined;

    // Pre-date trades to expiry — extend `to` to end-of-day to match the
    // bookkeeping UI's auto-pull semantics.
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const [mtdTrading, ytdTrading] = await Promise.allSettled([
      fetchWheelTradingSummary({
        userId: resolvedUserId!,
        from: mtdStart.toISOString(),
        to: endOfDay.toISOString(),
        portfolioIds: selectedPortfolioIds,
      }),
      fetchWheelTradingSummary({
        userId: resolvedUserId!,
        from: ytdStart.toISOString(),
        to: endOfDay.toISOString(),
        portfolioIds: selectedPortfolioIds,
      }),
    ]);

    const mtdTradingPnl =
      mtdTrading.status === "fulfilled" ? mtdTrading.value.totalPnl : 0;
    const ytdTradingPnl =
      ytdTrading.status === "fulfilled" ? ytdTrading.value.totalPnl : 0;
    if (mtdTrading.status === "rejected") {
      console.warn("[internal/portal-summary] MTD trading-summary fetch failed:", mtdTrading.reason);
    }
    if (ytdTrading.status === "rejected") {
      console.warn("[internal/portal-summary] YTD trading-summary fetch failed:", ytdTrading.reason);
    }

    let mtdIncome = 0;
    let mtdExpenses = 0;
    let ytdIncome = 0;
    let ytdExpenses = 0;

    for (const e of entries) {
      const amount = Number(e.amount);
      if (e.recurring) {
        if (e.type === "income") {
          mtdIncome += amount;
          ytdIncome += amount * monthsElapsedYtd;
        } else {
          mtdExpenses += amount;
          ytdExpenses += amount * monthsElapsedYtd;
        }
      } else {
        if (e.date >= mtdStart) {
          if (e.type === "income") mtdIncome += amount;
          else mtdExpenses += amount;
        }
        if (e.date >= ytdStart) {
          if (e.type === "income") ytdIncome += amount;
          else ytdExpenses += amount;
        }
      }
    }

    const mtdIncomeWithTrading = mtdIncome + mtdTradingPnl;
    const ytdIncomeWithTrading = ytdIncome + ytdTradingPnl;

    return internalResponse({
      mtdNet: mtdIncomeWithTrading - mtdExpenses,
      mtdIncome: mtdIncomeWithTrading,
      mtdExpenses,
      ytdNet: ytdIncomeWithTrading - ytdExpenses,
      mtdTradingPnl,
      ytdTradingPnl,
    });
  } catch (error) {
    console.error("[internal/portal-summary] error:", error);
    return internalError("Internal server error", 500);
  }
}
