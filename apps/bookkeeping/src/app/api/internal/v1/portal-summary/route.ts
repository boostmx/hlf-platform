import {
  validateInternalApiKey,
  internalResponse,
  internalError,
} from "@/server/api/internal";
import prisma from "@/server/prisma";
import { authPrisma } from "@hlf/auth-db";

// GET /api/internal/v1/portal-summary?email=  (or ?userId=)
// MTD / YTD income & expense net from bookkeeping entries. Recurring entries
// store a monthly amount and contribute to every month regardless of `date`,
// matching how exportCsv and the dashboard render them.
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
      return internalResponse({ mtdNet: 0, mtdIncome: 0, mtdExpenses: 0, ytdNet: 0 });
    }
    resolvedUserId = user.id;
  }

  const now = new Date();
  const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const ytdStart = new Date(now.getFullYear(), 0, 1);
  const monthsElapsedYtd = now.getMonth() + 1;

  try {
    const entries = await prisma.bookkeepingEntry.findMany({
      where: { userId: resolvedUserId! },
      select: { type: true, amount: true, date: true, recurring: true },
    });

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

    return internalResponse({
      mtdNet: mtdIncome - mtdExpenses,
      mtdIncome,
      mtdExpenses,
      ytdNet: ytdIncome - ytdExpenses,
    });
  } catch (error) {
    console.error("[internal/portal-summary] error:", error);
    return internalError("Internal server error", 500);
  }
}
