import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({ tickerId: z.string() });

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input." }, { status: 400 });

  const { tickerId } = parsed.data;

  const ticker = await prisma.ticker.findUnique({ where: { id: tickerId, isApproved: true } });
  if (!ticker) return NextResponse.json({ error: "Ticker not found." }, { status: 404 });

  await prisma.subscription.upsert({
    where: { userId_tickerId: { userId: session.user.id, tickerId } },
    update: {},
    create: { userId: session.user.id, tickerId },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input." }, { status: 400 });

  const { tickerId } = parsed.data;

  await prisma.subscription.deleteMany({
    where: { userId: session.user.id, tickerId },
  });

  return NextResponse.json({ ok: true });
}
