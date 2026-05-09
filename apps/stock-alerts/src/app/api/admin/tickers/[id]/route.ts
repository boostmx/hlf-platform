import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/requireAuth";
import prisma from "@/server/prisma";
import { z } from "zod";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const parsed = z
    .object({ isApproved: z.boolean() })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const ticker = await prisma.ticker.update({
    where: { id },
    data: { isApproved: parsed.data.isApproved },
  });

  return NextResponse.json(ticker);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  await prisma.ticker.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
