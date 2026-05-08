import { NextRequest, NextResponse } from "next/server";
import prisma from "@/server/prisma";
import { requireAdmin } from "@/server/auth/requireAdmin";

type DbEntry = Awaited<ReturnType<typeof prisma.bookkeepingEntry.findFirst>>;

function serialize(e: NonNullable<DbEntry>) {
  return {
    ...e,
    amount: Number(e.amount),
    date: e.date.toISOString(),
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const existing = await prisma.bookkeepingEntry.findUnique({ where: { id } });
  if (!existing || existing.userId !== auth.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json() as {
    type?: "income" | "expense";
    name?: string;
    category?: string;
    amount?: number;
    description?: string;
    date?: string;
    recurring?: boolean;
  };

  const entry = await prisma.bookkeepingEntry.update({
    where: { id },
    data: {
      ...(body.type !== undefined && { type: body.type }),
      ...(body.name !== undefined && { name: body.name }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.amount !== undefined && { amount: body.amount }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.date !== undefined && { date: new Date(body.date) }),
      ...(body.recurring !== undefined && { recurring: body.recurring }),
    },
  });

  return NextResponse.json(serialize(entry));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const existing = await prisma.bookkeepingEntry.findUnique({ where: { id } });
  if (!existing || existing.userId !== auth.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.bookkeepingEntry.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
