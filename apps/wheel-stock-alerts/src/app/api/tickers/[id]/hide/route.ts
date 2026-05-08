import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: tickerId } = await params;

  await prisma.hiddenTicker.upsert({
    where: { userId_tickerId: { userId: session.user.id, tickerId } },
    update: {},
    create: { userId: session.user.id, tickerId },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: tickerId } = await params;

  await prisma.hiddenTicker.deleteMany({
    where: { userId: session.user.id, tickerId },
  });

  return NextResponse.json({ ok: true });
}
