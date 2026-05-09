import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/requireAuth";
import prisma from "@/server/prisma";
import { z } from "zod";

const schema = z.object({
  symbol: z.string().min(1).max(10).toUpperCase(),
  name: z.string().min(1).max(200),
  sector: z.string().max(100).optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const { symbol, name, sector } = parsed.data;

  const existing = await prisma.ticker.findUnique({ where: { symbol } });
  if (existing) return NextResponse.json({ error: "Ticker already exists." }, { status: 409 });

  const ticker = await prisma.ticker.create({
    data: {
      symbol,
      name,
      sector: sector ?? null,
      isApproved: true,
      createdBy: auth.userId,
    },
  });

  return NextResponse.json(ticker, { status: 201 });
}
