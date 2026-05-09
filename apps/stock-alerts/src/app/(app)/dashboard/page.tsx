import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/auth";
import prisma from "@/server/prisma";
import { redirect } from "next/navigation";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/sign-in");

  const [recentAlerts, subscriptions] = await Promise.all([
    prisma.alert
      .findMany({
        where: { userId: session.user.id },
        include: { ticker: { select: { symbol: true, name: true } } },
        orderBy: { sentAt: "desc" },
        take: 20,
      })
      .catch(() => []),
    prisma.subscription
      .findMany({
        where: { userId: session.user.id },
        include: {
          ticker: {
            select: {
              id: true,
              symbol: true,
              name: true,
              sector: true,
              lastPrice: true,
              lastUpdated: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      })
      .catch(() => []),
  ]);

  return <DashboardClient recentAlerts={recentAlerts} subscriptions={subscriptions} />;
}
