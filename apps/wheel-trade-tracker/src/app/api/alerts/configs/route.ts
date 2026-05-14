import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/auth";
import prisma from "@/server/prisma";
import { z } from "zod";
import { paramsByType } from "@/lib/alerts/types";

const createBody = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("PROFIT_TARGET"),
    tradeId: z.string().min(1),
    params: paramsByType.PROFIT_TARGET,
  }),
  z.object({
    type: z.literal("ASSIGNMENT_RISK"),
    tradeId: z.string().min(1),
    params: paramsByType.ASSIGNMENT_RISK,
  }),
  z.object({
    type: z.literal("ROLL_OPPORTUNITY"),
    tradeId: z.string().min(1),
    params: paramsByType.ROLL_OPPORTUNITY,
  }),
  z.object({
    type: z.literal("WATCHLIST_BREACH"),
    watchlistTicker: z.string().min(1).max(10),
    params: paramsByType.WATCHLIST_BREACH,
  }),
]);

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const tradeId = searchParams.get("tradeId");
  const ticker = searchParams.get("watchlistTicker");
  const includeTrade = searchParams.get("includeTrade") === "1";

  const configs = await prisma.alertConfig.findMany({
    where: {
      userId: session.user.id,
      ...(tradeId ? { tradeId } : {}),
      ...(ticker ? { watchlistTicker: ticker } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  if (!includeTrade) return NextResponse.json({ configs });

  // Enrich trade-bound configs with the trade's surface fields so the /alerts
  // page can render meaningful rows without a second round-trip.
  const tradeIds = configs
    .map((c) => c.tradeId)
    .filter((id): id is string => Boolean(id));
  const trades = tradeIds.length
    ? await prisma.trade.findMany({
        where: { id: { in: tradeIds } },
        select: {
          id: true,
          ticker: true,
          type: true,
          strikePrice: true,
          expirationDate: true,
          status: true,
          portfolioId: true,
        },
      })
    : [];
  const tradeById = new Map(trades.map((t) => [t.id, t]));

  const enriched = configs.map((c) => ({
    ...c,
    trade: c.tradeId ? tradeById.get(c.tradeId) ?? null : null,
  }));
  return NextResponse.json({ configs: enriched });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parse = createBody.safeParse(await request.json().catch(() => null));
  if (!parse.success) {
    return NextResponse.json({ error: "Invalid body", details: parse.error.issues }, { status: 400 });
  }
  const data = parse.data;

  // Confirm the trade is the user's own, if trade-bound
  if (data.type !== "WATCHLIST_BREACH") {
    const trade = await prisma.trade.findUnique({
      where: { id: data.tradeId },
      include: { portfolio: { select: { userId: true } } },
    });
    if (!trade || trade.portfolio.userId !== session.user.id) {
      return NextResponse.json({ error: "Trade not found" }, { status: 404 });
    }
  }

  const created = await prisma.alertConfig.create({
    data: {
      userId: session.user.id,
      type: data.type,
      tradeId: data.type === "WATCHLIST_BREACH" ? null : data.tradeId,
      watchlistTicker:
        data.type === "WATCHLIST_BREACH" ? data.watchlistTicker.toUpperCase() : null,
      params: data.params,
    },
  });
  return NextResponse.json({ config: created }, { status: 201 });
}
