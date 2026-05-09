import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import prisma from "@/server/prisma";
import { z } from "zod";

const schema = z.object({
  tickerId: z.string().min(1),
  positionType: z.enum(["CSP", "CC", "STOCK"]),
  contracts: z.number().int().min(1).optional().default(1),
  strikePrice: z.number().positive().optional().nullable(),
  premium: z.number().positive().optional().nullable(),
  shares: z.number().int().positive().optional().nullable(),
  entryPrice: z.number().positive().optional().nullable(),
  expirationDate: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const positions = await prisma.userPosition.findMany({
    where: { userId: auth.userId, closedAt: null },
    include: { ticker: { select: { id: true, symbol: true, name: true } } },
    orderBy: { openedAt: "desc" },
  });

  return NextResponse.json(positions);
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const {
    tickerId,
    positionType,
    contracts,
    strikePrice,
    premium,
    shares,
    entryPrice,
    expirationDate,
    notes,
  } = parsed.data;

  const ticker = await prisma.ticker.findUnique({
    where: { id: tickerId },
    select: { id: true },
  });
  if (!ticker) return NextResponse.json({ error: "Ticker not found." }, { status: 404 });

  const position = await prisma.userPosition.create({
    data: {
      userId: auth.userId,
      tickerId,
      positionType,
      contracts,
      strikePrice: strikePrice ?? null,
      premium: premium ?? null,
      shares: shares ?? null,
      entryPrice: entryPrice ?? null,
      expirationDate: expirationDate ? new Date(expirationDate + "T12:00:00") : null,
      notes: notes ?? null,
    },
    include: { ticker: { select: { id: true, symbol: true, name: true } } },
  });

  return NextResponse.json(position, { status: 201 });
}
