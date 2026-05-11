import {
  validateInternalApiKey,
  internalResponse,
  internalError,
} from "@/server/api/internal";
import prisma from "@/server/prisma";
import { authPrisma } from "@hlf/auth-db";
import { computeFiNumber, computeFireScore } from "@/lib/fireCalc";

// GET /api/internal/v1/portal-summary?email=  (or ?userId=)
// MTD spend (one-time + recurring), total monthly budget (MonthlyBudget
// overrides + Category.monthlyBudget defaults), and FIRE % from FIREProfile +
// current investable assets.
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
        mtdSpent: 0,
        monthlyBudgetTotal: 0,
        remaining: 0,
        fireScorePct: null,
      });
    }
    resolvedUserId = user.id;
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  try {
    const [
      transactions,
      recurring,
      categories,
      monthlyBudgets,
      investments,
      fireProfile,
    ] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          userId: resolvedUserId!,
          type: "expense",
          date: { gte: start, lt: end },
        },
        select: { amount: true, categoryId: true },
      }),
      prisma.recurringTransaction.findMany({
        where: { userId: resolvedUserId!, type: "expense", isActive: true },
        select: { amount: true, categoryId: true },
      }),
      prisma.category.findMany({
        where: { userId: resolvedUserId! },
        select: { id: true, monthlyBudget: true, isSavings: true, type: true },
      }),
      prisma.monthlyBudget.findMany({
        where: { userId: resolvedUserId!, year, month },
        select: { categoryId: true, budgetAmount: true },
      }),
      prisma.investment.findMany({
        where: { userId: resolvedUserId! },
        select: { currentValue: true },
      }),
      prisma.fIREProfile.findUnique({
        where: { userId: resolvedUserId! },
      }),
    ]);

    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    let mtdSpent = 0;
    for (const t of transactions) {
      const cat = t.categoryId ? categoryMap.get(t.categoryId) : null;
      if (cat?.isSavings) continue;
      mtdSpent += Number(t.amount);
    }
    for (const r of recurring) {
      const cat = r.categoryId ? categoryMap.get(r.categoryId) : null;
      if (cat?.isSavings) continue;
      mtdSpent += Number(r.amount);
    }

    const overrideMap = new Map(
      monthlyBudgets.map((b) => [b.categoryId, Number(b.budgetAmount)]),
    );
    let monthlyBudgetTotal = 0;
    for (const cat of categories) {
      if (cat.type !== "expense" || cat.isSavings) continue;
      const override = overrideMap.get(cat.id);
      const defaultBudget = cat.monthlyBudget != null ? Number(cat.monthlyBudget) : 0;
      monthlyBudgetTotal += override ?? defaultBudget;
    }

    let fireScorePct: number | null = null;
    if (fireProfile) {
      const fiNumber = computeFiNumber(
        Number(fireProfile.targetAnnualExpenses),
        Number(fireProfile.safeWithdrawalRate),
      );
      const investableAssets = investments.reduce(
        (sum, inv) => sum + Number(inv.currentValue),
        0,
      );
      fireScorePct = computeFireScore(investableAssets, fiNumber);
    }

    return internalResponse({
      mtdSpent,
      monthlyBudgetTotal,
      remaining: monthlyBudgetTotal - mtdSpent,
      fireScorePct,
    });
  } catch (error) {
    console.error("[internal/portal-summary] error:", error);
    return internalError("Internal server error", 500);
  }
}
