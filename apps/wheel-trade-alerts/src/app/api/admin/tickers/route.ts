import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  symbol: z.string().min(1).max(10).toUpperCase(),
  name: z.string().min(1).max(200),
  sector: z.string().max(100).optional(),
});

async function requireAdmin(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input." }, { status: 400 });

  const { symbol, name, sector } = parsed.data;

  const existing = await prisma.ticker.findUnique({ where: { symbol } });
  if (existing) return NextResponse.json({ error: "Ticker already exists." }, { status: 409 });

  const ticker = await prisma.ticker.create({
    data: { symbol, name, sector, isApproved: true },
  });

  return NextResponse.json(ticker, { status: 201 });
}
