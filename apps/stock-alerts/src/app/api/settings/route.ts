import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import { getUserPreferences, updateUserPreferences } from "@/server/userPreferences";
import { z } from "zod";

const thresholdsSchema = z.object({
  rsiOversold: z.number().min(10).max(50),
  rsiOverbought: z.number().min(50).max(90),
  supportProximityPct: z.number().min(0.5).max(10),
  resistanceProximityPct: z.number().min(0.5).max(10),
  volumeSurgeMultiplier: z.number().min(1.2).max(5),
});

const schema = z.object({
  discordWebhook: z.string().url().optional().or(z.literal("")),
  emailEnabled: z.boolean().optional(),
  thresholds: thresholdsSchema.optional(),
  watchedPortfolioIds: z.array(z.string()).optional(),
});

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const prefs = await getUserPreferences(auth.userId);
  return NextResponse.json(prefs);
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const { discordWebhook, emailEnabled, thresholds, watchedPortfolioIds } = parsed.data;

  const updated = await updateUserPreferences(auth.userId, {
    ...(emailEnabled !== undefined && { emailEnabled }),
    ...(discordWebhook !== undefined && { discordWebhook: discordWebhook || null }),
    ...(thresholds !== undefined && { thresholds }),
    ...(watchedPortfolioIds !== undefined && { watchedPortfolioIds }),
  });

  return NextResponse.json(updated);
}
