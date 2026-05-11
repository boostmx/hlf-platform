import {
  validateInternalApiKey,
  internalResponse,
  internalError,
} from "@/server/api/internal";
import prisma from "@/server/prisma";
import { authPrisma } from "@hlf/auth-db";

// GET /api/internal/v1/portal-summary?email=  (or ?userId=)
// Counts and latest 10 alerts for the portal dashboard inbox.
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
      return internalResponse({ alertsToday: 0, alertsThisWeek: 0, recentAlerts: [] });
    }
    resolvedUserId = user.id;
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  try {
    const [alertsToday, alertsThisWeek, recentAlerts] = await Promise.all([
      prisma.alert.count({
        where: { userId: resolvedUserId!, sentAt: { gte: todayStart } },
      }),
      prisma.alert.count({
        where: { userId: resolvedUserId!, sentAt: { gte: weekStart } },
      }),
      prisma.alert.findMany({
        where: { userId: resolvedUserId! },
        orderBy: { sentAt: "desc" },
        take: 10,
        select: {
          id: true,
          type: true,
          message: true,
          sentAt: true,
          ticker: { select: { symbol: true } },
        },
      }),
    ]);

    return internalResponse({
      alertsToday,
      alertsThisWeek,
      recentAlerts: recentAlerts.map((a) => ({
        id: a.id,
        ticker: a.ticker.symbol,
        type: a.type,
        message: a.message,
        sentAt: a.sentAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[internal/portal-summary] error:", error);
    return internalError("Internal server error", 500);
  }
}
