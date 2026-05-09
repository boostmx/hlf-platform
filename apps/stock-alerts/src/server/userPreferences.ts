import prisma from "@/server/prisma";
import { DEFAULT_THRESHOLDS, type Thresholds } from "@/lib/signals";

// Per-user app settings. Created on first read with defaults so callers can
// rely on a row always existing for a given userId.

export type UserPreferences = {
  userId: string;
  emailEnabled: boolean;
  discordWebhook: string | null;
  thresholds: Thresholds;
  watchedPortfolioIds: string[];
};

function coerceThresholds(value: unknown): Thresholds {
  if (!value || typeof value !== "object") return { ...DEFAULT_THRESHOLDS };
  const v = value as Partial<Thresholds>;
  return {
    rsiOversold: typeof v.rsiOversold === "number" ? v.rsiOversold : DEFAULT_THRESHOLDS.rsiOversold,
    rsiOverbought:
      typeof v.rsiOverbought === "number" ? v.rsiOverbought : DEFAULT_THRESHOLDS.rsiOverbought,
    supportProximityPct:
      typeof v.supportProximityPct === "number"
        ? v.supportProximityPct
        : DEFAULT_THRESHOLDS.supportProximityPct,
    resistanceProximityPct:
      typeof v.resistanceProximityPct === "number"
        ? v.resistanceProximityPct
        : DEFAULT_THRESHOLDS.resistanceProximityPct,
    volumeSurgeMultiplier:
      typeof v.volumeSurgeMultiplier === "number"
        ? v.volumeSurgeMultiplier
        : DEFAULT_THRESHOLDS.volumeSurgeMultiplier,
  };
}

function coercePortfolioIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

export async function getUserPreferences(userId: string): Promise<UserPreferences> {
  // findUnique then create on miss — sidesteps any Prisma upsert quirks with
  // empty `update: {}` and only writes when there's no existing row.
  const existing = await prisma.userPreferences.findUnique({ where: { userId } });
  const row =
    existing ??
    (await prisma.userPreferences.create({
      data: { userId, updatedAt: new Date() },
    }));
  return {
    userId: row.userId,
    emailEnabled: row.emailEnabled,
    discordWebhook: row.discordWebhook,
    thresholds: coerceThresholds(row.thresholds),
    watchedPortfolioIds: coercePortfolioIds(row.watchedPortfolioIds),
  };
}

export async function updateUserPreferences(
  userId: string,
  patch: Partial<{
    emailEnabled: boolean;
    discordWebhook: string | null;
    thresholds: Partial<Thresholds>;
    watchedPortfolioIds: string[];
  }>,
): Promise<UserPreferences> {
  const current = await getUserPreferences(userId);
  const next = {
    emailEnabled: patch.emailEnabled ?? current.emailEnabled,
    discordWebhook:
      patch.discordWebhook === undefined ? current.discordWebhook : patch.discordWebhook,
    thresholds: { ...current.thresholds, ...(patch.thresholds ?? {}) },
    watchedPortfolioIds: patch.watchedPortfolioIds ?? current.watchedPortfolioIds,
  };

  const row = await prisma.userPreferences.update({
    where: { userId },
    data: {
      emailEnabled: next.emailEnabled,
      discordWebhook: next.discordWebhook,
      thresholds: next.thresholds as unknown as object,
      watchedPortfolioIds: next.watchedPortfolioIds,
    },
  });

  return {
    userId: row.userId,
    emailEnabled: row.emailEnabled,
    discordWebhook: row.discordWebhook,
    thresholds: coerceThresholds(row.thresholds),
    watchedPortfolioIds: coercePortfolioIds(row.watchedPortfolioIds),
  };
}
