import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import prisma from "@/server/prisma";
import { z } from "zod";

const schema = z.object({ tickerId: z.string() });

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const { tickerId } = parsed.data;

  const ticker = await prisma.ticker.findUnique({
    where: { id: tickerId, isApproved: true },
  });
  if (!ticker) return NextResponse.json({ error: "Ticker not found." }, { status: 404 });

  await prisma.subscription.upsert({
    where: { userId_tickerId: { userId: auth.userId, tickerId } },
    update: {},
    create: { userId: auth.userId, tickerId },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const { tickerId } = parsed.data;

  await prisma.subscription.deleteMany({
    where: { userId: auth.userId, tickerId },
  });

  return NextResponse.json({ ok: true });
}
