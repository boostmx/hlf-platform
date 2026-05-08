import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const ticker = await prisma.ticker.findUnique({ where: { id }, select: { createdBy: true, symbol: true } });

  if (!ticker) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (ticker.createdBy !== session.user.id) return NextResponse.json({ error: "You can only delete tickers you added." }, { status: 403 });

  await prisma.ticker.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
