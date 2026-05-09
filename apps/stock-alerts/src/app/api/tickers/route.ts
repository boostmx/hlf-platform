import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import prisma from "@/server/prisma";

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { symbol, name, sector } = await req.json();

  if (!symbol || !name) {
    return NextResponse.json({ error: "Symbol and name are required." }, { status: 400 });
  }

  const clean = symbol.toUpperCase().trim();

  const existing = await prisma.ticker.findUnique({ where: { symbol: clean } });
  if (existing) {
    return NextResponse.json(
      { error: `${clean} is already in the ticker list.` },
      { status: 409 },
    );
  }

  const ticker = await prisma.ticker.create({
    data: {
      symbol: clean,
      name: name.trim(),
      sector: sector?.trim() || null,
      isApproved: true,
      createdBy: auth.userId,
    },
  });

  return NextResponse.json(ticker, { status: 201 });
}
