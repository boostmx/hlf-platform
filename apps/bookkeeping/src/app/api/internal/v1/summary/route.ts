import {
  validateInternalApiKey,
  internalResponse,
  internalError,
} from "@/server/api/internal";
import prisma from "@/server/prisma";

// GET /api/internal/v1/summary?userId=&year=&from=&to=
// Returns aggregated income/expense totals by category for a period.
// Consumer: future cross-app dashboards, tax integrations
export async function GET(request: Request) {
  if (!validateInternalApiKey(request)) {
    return internalError("Unauthorized", 401);
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const year = searchParams.get("year");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!userId) {
    return internalError("userId is required", 400);
  }

  // year param is a convenience shorthand for from/to
  let dateFilter: { gte?: Date; lte?: Date } | undefined;
  if (year) {
    const y = parseInt(year, 10);
    if (isNaN(y)) return internalError("year must be a number", 400);
    dateFilter = {
      gte: new Date(`${y}-01-01T00:00:00.000Z`),
      lte: new Date(`${y}-12-31T23:59:59.999Z`),
    };
  } else if (from || to) {
    dateFilter = {
      ...(from && { gte: new Date(from) }),
      ...(to && { lte: new Date(to) }),
    };
  }

  try {
    const entries = await prisma.bookkeepingEntry.findMany({
      where: {
        userId,
        ...(dateFilter && { date: dateFilter }),
      },
      select: {
        type: true,
        category: true,
        amount: true,
        recurring: true,
      },
    });

    let totalIncome = 0;
    let totalExpense = 0;
    const categoryMap = new Map<
      string,
      { type: string; total: number; count: number }
    >();

    for (const e of entries) {
      const amount = Number(e.amount);
      if (e.type === "income") totalIncome += amount;
      else totalExpense += amount;

      const key = `${e.type}:${e.category}`;
      const existing = categoryMap.get(key);
      if (existing) {
        existing.total += amount;
        existing.count += 1;
      } else {
        categoryMap.set(key, { type: e.type, total: amount, count: 1 });
      }
    }

    const byCategory = Array.from(categoryMap.entries())
      .map(([key, v]) => ({
        category: key.split(":")[1],
        type: v.type,
        total: v.total,
        count: v.count,
      }))
      .sort((a, b) => b.total - a.total);

    return internalResponse({
      totalIncome,
      totalExpense,
      net: totalIncome - totalExpense,
      byCategory,
    });
  } catch (error) {
    console.error("[internal/summary] error:", error);
    return internalError("Internal server error", 500);
  }
}
