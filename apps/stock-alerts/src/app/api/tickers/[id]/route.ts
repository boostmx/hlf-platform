import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import prisma from "@/server/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const ticker = await prisma.ticker.findUnique({
    where: { id },
    select: { createdBy: true, symbol: true },
  });

  if (!ticker) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (ticker.createdBy !== auth.userId) {
    return NextResponse.json(
      { error: "You can only delete tickers you added." },
      { status: 403 },
    );
  }

  await prisma.ticker.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
