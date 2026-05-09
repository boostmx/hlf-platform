import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import { authPrisma } from "@hlf/auth-db";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const user = await authPrisma.user.findUnique({
    where: { id: auth.userId },
    select: { id: true, username: true, firstName: true, lastName: true, email: true, bio: true, avatarUrl: true, isAdmin: true, createdAt: true },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ...user, createdAt: user.createdAt.toISOString() });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const body = await req.json() as {
    firstName?: string; lastName?: string; email?: string; bio?: string | null;
  };

  const updated = await authPrisma.user.update({
    where: { id: auth.userId },
    data: {
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      bio: body.bio,
    },
    select: { id: true, username: true, firstName: true, lastName: true, email: true, bio: true, avatarUrl: true, isAdmin: true, createdAt: true },
  });

  return NextResponse.json({ ...updated, createdAt: updated.createdAt.toISOString() });
}
