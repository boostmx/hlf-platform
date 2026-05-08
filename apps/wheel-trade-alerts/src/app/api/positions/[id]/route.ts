import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const position = await prisma.userPosition.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!position) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const updated = await prisma.userPosition.update({
    where: { id },
    data: {
      ...(body.close && { closedAt: new Date() }),
      ...(body.notes !== undefined && { notes: body.notes }),
    },
    include: { ticker: { select: { id: true, symbol: true, name: true } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const position = await prisma.userPosition.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!position) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await prisma.userPosition.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
