import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const thresholdsSchema = z.object({
  rsiOversold: z.number().min(10).max(50),
  rsiOverbought: z.number().min(50).max(90),
  supportProximityPct: z.number().min(0.5).max(10),
  resistanceProximityPct: z.number().min(0.5).max(10),
  volumeSurgeMultiplier: z.number().min(1.2).max(5),
});

const schema = z.object({
  name: z.string().min(1).max(100).optional(),
  discordWebhook: z.string().url().optional().or(z.literal("")),
  emailEnabled: z.boolean().optional(),
  thresholds: thresholdsSchema.optional(),
  watchedPortfolioIds: z.array(z.string()).optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input." }, { status: 400 });

  const { name, discordWebhook, emailEnabled, thresholds, watchedPortfolioIds } = parsed.data;

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(name !== undefined && { name }),
      ...(discordWebhook !== undefined && { discordWebhook: discordWebhook || null }),
      ...(emailEnabled !== undefined && { emailEnabled }),
      ...(thresholds !== undefined && { thresholds }),
      ...(watchedPortfolioIds !== undefined && { watchedPortfolioIds }),
    },
  });

  return NextResponse.json({ ok: true });
}
