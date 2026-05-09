import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import prisma from "@/server/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json();

  const position = await prisma.userPosition.findFirst({
    where: { id, userId: auth.userId },
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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const position = await prisma.userPosition.findFirst({
    where: { id, userId: auth.userId },
  });
  if (!position) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await prisma.userPosition.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
