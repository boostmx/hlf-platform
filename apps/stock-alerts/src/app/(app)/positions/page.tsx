import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/auth";
import prisma from "@/server/prisma";
import { redirect } from "next/navigation";
import {
  fetchWheelOpenPositions,
  isWheelTrackerConfigured,
} from "@/lib/wheel-tracker-client";
import type { WheelOpenPositions } from "@/lib/wheel-tracker-client";
import { getUserPreferences } from "@/server/userPreferences";
import { PositionsClient } from "./positions-client";

export default async function PositionsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/sign-in");

  const prefs = await getUserPreferences(session.user.id);
  const watchedIds = prefs.watchedPortfolioIds;
  const configured = isWheelTrackerConfigured();

  const [rawPositions, manualPositions, tickers] = await Promise.all([
    configured
      ? fetchWheelOpenPositions(session.user.email).catch(() => ({ trades: [], stockLots: [] }))
      : Promise.resolve<WheelOpenPositions>({ trades: [], stockLots: [] }),
    prisma.userPosition
      .findMany({
        where: { userId: session.user.id, closedAt: null },
        include: { ticker: { select: { id: true, symbol: true, name: true } } },
        orderBy: { openedAt: "desc" },
      })
      .catch(() => []),
    prisma.ticker
      .findMany({
        where: { isApproved: true },
        select: { id: true, symbol: true, name: true },
        orderBy: { symbol: "asc" },
      })
      .catch(() => []),
  ]);

  const trackerPositions: WheelOpenPositions =
    watchedIds.length > 0
      ? {
          trades: rawPositions.trades.filter((t) => watchedIds.includes(t.portfolioId)),
          stockLots: rawPositions.stockLots.filter((l) => watchedIds.includes(l.portfolioId)),
        }
      : rawPositions;

  const serializedManual = manualPositions.map((p) => ({
    ...p,
    expirationDate: p.expirationDate ? p.expirationDate.toISOString() : null,
    openedAt: p.openedAt.toISOString(),
    closedAt: p.closedAt ? p.closedAt.toISOString() : null,
  }));

  return (
    <PositionsClient
      trackerPositions={trackerPositions}
      isTrackerConfigured={configured}
      manualPositions={serializedManual}
      tickers={tickers}
    />
  );
}
