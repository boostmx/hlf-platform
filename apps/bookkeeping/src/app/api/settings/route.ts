import { NextRequest, NextResponse } from "next/server";
import prisma from "@/server/prisma";
import { requireAdmin } from "@/server/auth/requireAdmin";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const settings = await prisma.bookkeepingSettings.findUnique({
    where: { userId: auth.userId },
  });

  return NextResponse.json({
    tradingPortfolios: settings?.tradingPortfolios ?? "all",
  });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { tradingPortfolios } = await req.json() as { tradingPortfolios: string };

  const settings = await prisma.bookkeepingSettings.upsert({
    where: { userId: auth.userId },
    create: { userId: auth.userId, tradingPortfolios: tradingPortfolios ?? "all" },
    update: { tradingPortfolios: tradingPortfolios ?? "all" },
  });

  return NextResponse.json({ tradingPortfolios: settings.tradingPortfolios });
}
