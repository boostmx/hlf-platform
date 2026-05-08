import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { symbol, name, sector } = await req.json();

  if (!symbol || !name) {
    return NextResponse.json({ error: "Symbol and name are required." }, { status: 400 });
  }

  const clean = symbol.toUpperCase().trim();

  const existing = await prisma.ticker.findUnique({ where: { symbol: clean } });
  if (existing) {
    return NextResponse.json({ error: `${clean} is already in the ticker list.` }, { status: 409 });
  }

  const ticker = await prisma.ticker.create({
    data: { symbol: clean, name: name.trim(), sector: sector?.trim() || null, isApproved: true, createdBy: session.user.id },
  });

  return NextResponse.json(ticker, { status: 201 });
}
