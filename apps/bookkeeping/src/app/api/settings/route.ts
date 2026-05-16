import { NextRequest, NextResponse } from "next/server";
import { authPrisma } from "@hlf/auth-db";
import { requireAdmin } from "@/server/auth/requireAdmin";

// tradingPortfolios now lives on @hlf/auth-db's User table as a shared per-user
// setting. The portal owns the canonical UI for it; bookkeeping's own Settings
// page reads/writes the same column so toggles stay in sync.
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const user = await authPrisma.user.findUnique({
    where: { id: auth.userId },
    select: { tradingPortfolios: true },
  });

  return NextResponse.json({
    tradingPortfolios: user?.tradingPortfolios ?? "all",
  });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { tradingPortfolios } = (await req.json()) as { tradingPortfolios?: string };

  const updated = await authPrisma.user.update({
    where: { id: auth.userId },
    data: { tradingPortfolios: tradingPortfolios ?? "all" },
    select: { tradingPortfolios: true },
  });

  return NextResponse.json({ tradingPortfolios: updated.tradingPortfolios });
}
