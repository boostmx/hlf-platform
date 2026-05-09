import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/auth";
import { authPrisma } from "@hlf/auth-db";
import { prisma } from "@/server/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await authPrisma.user.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      username: true,
      isAdmin: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const counts = await prisma.portfolio.groupBy({
    by: ["userId"],
    where: { userId: { in: users.map((u) => u.id) } },
    _count: { _all: true },
  });
  const countByUser = new Map(counts.map((c) => [c.userId, c._count._all]));

  return NextResponse.json(
    users.map((u) => ({
      ...u,
      _count: { portfolios: countByUser.get(u.id) ?? 0 },
    })),
  );
}
