import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import prisma from "@/server/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { id: tickerId } = await params;

  await prisma.hiddenTicker.upsert({
    where: { userId_tickerId: { userId: auth.userId, tickerId } },
    update: {},
    create: { userId: auth.userId, tickerId },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { id: tickerId } = await params;

  await prisma.hiddenTicker.deleteMany({
    where: { userId: auth.userId, tickerId },
  });

  return NextResponse.json({ ok: true });
}
