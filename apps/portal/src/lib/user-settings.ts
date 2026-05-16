// Server-side helpers for the per-user settings stored in @hlf/auth-db.
// Right now the only shared setting is `tradingPortfolios`.

import { authPrisma } from "@hlf/auth-db";

// Returns the parsed selection. `undefined` means "all" (don't filter).
// An array of IDs means apply the filter.
export async function getUserTradingPortfolios(
  userId: string,
): Promise<string[] | undefined> {
  const user = await authPrisma.user.findUnique({
    where: { id: userId },
    select: { tradingPortfolios: true },
  });
  if (!user || !user.tradingPortfolios || user.tradingPortfolios === "all") {
    return undefined;
  }
  const ids = user.tradingPortfolios.split(",").filter(Boolean);
  return ids.length > 0 ? ids : undefined;
}
