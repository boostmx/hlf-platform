import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authPrisma } from "@hlf/auth-db";
import { authOptions } from "@/server/auth/auth";

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

  return NextResponse.json(users);
}
