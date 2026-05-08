import { NextRequest, NextResponse } from "next/server";
import prisma from "@/server/prisma";
import { requireAdmin } from "@/server/auth/requireAdmin";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ yearMonth: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { yearMonth } = await params;
  const note = await prisma.bookkeepingMonthNote.findUnique({
    where: { userId_yearMonth: { userId: auth.userId, yearMonth } },
  });

  return NextResponse.json({ notes: note?.notes ?? "" });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ yearMonth: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { yearMonth } = await params;
  const { notes } = await req.json() as { notes: string };

  const note = await prisma.bookkeepingMonthNote.upsert({
    where: { userId_yearMonth: { userId: auth.userId, yearMonth } },
    create: { userId: auth.userId, yearMonth, notes: notes ?? "" },
    update: { notes: notes ?? "" },
  });

  return NextResponse.json({ notes: note.notes });
}
