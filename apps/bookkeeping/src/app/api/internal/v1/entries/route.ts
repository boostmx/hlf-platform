import {
  validateInternalApiKey,
  internalResponse,
  internalError,
} from "@/server/api/internal";
import prisma from "@/server/prisma";

// GET /api/internal/v1/entries?userId=&from=&to=&type=income|expense
// Returns bookkeeping entries for a user, optionally filtered by date and type.
// Consumer: future reporting tools, tax integrations
export async function GET(request: Request) {
  if (!validateInternalApiKey(request)) {
    return internalError("Unauthorized", 401);
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const type = searchParams.get("type") as "income" | "expense" | null;

  if (!userId) {
    return internalError("userId is required", 400);
  }

  if (type && type !== "income" && type !== "expense") {
    return internalError("type must be income or expense", 400);
  }

  const dateFilter =
    from || to
      ? {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        }
      : undefined;

  try {
    const entries = await prisma.bookkeepingEntry.findMany({
      where: {
        userId,
        ...(type && { type }),
        ...(dateFilter && { date: dateFilter }),
      },
      select: {
        id: true,
        type: true,
        name: true,
        category: true,
        amount: true,
        description: true,
        date: true,
        source: true,
        recurring: true,
        createdAt: true,
      },
      orderBy: { date: "desc" },
    });

    return internalResponse(
      entries.map((e) => ({
        ...e,
        amount: Number(e.amount),
        date: e.date.toISOString(),
        createdAt: e.createdAt.toISOString(),
      })),
      { total: entries.length },
    );
  } catch (error) {
    console.error("[internal/entries] error:", error);
    return internalError("Internal server error", 500);
  }
}
