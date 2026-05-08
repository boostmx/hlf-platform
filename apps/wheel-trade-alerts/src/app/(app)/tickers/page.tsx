import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { TickersClient } from "./tickers-client";

export default async function TickersPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/sign-in");

  const [tickers, subscriptions, hidden] = await Promise.all([
    prisma.ticker.findMany({
      where: {
        isApproved: true,
        OR: [{ createdBy: null }, { createdBy: session.user.id }],
      },
      select: { id: true, symbol: true, name: true, sector: true, lastPrice: true, createdBy: true },
      orderBy: { symbol: "asc" },
    }).catch(() => []),
    prisma.subscription.findMany({
      where: { userId: session.user.id },
      select: { tickerId: true },
    }).catch(() => []),
    prisma.hiddenTicker.findMany({
      where: { userId: session.user.id },
      select: { tickerId: true },
    }).catch(() => []),
  ]);

  return (
    <TickersClient
      tickers={tickers}
      subscribedIds={subscriptions.map(s => s.tickerId)}
      hiddenIds={hidden.map(h => h.tickerId)}
    />
  );
}
