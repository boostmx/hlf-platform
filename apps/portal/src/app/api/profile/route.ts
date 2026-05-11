import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authPrisma } from "@hlf/auth-db";
import { authOptions } from "@/server/auth/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await authPrisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      username: true,
      bio: true,
      avatarUrl: true,
      isAdmin: true,
      createdAt: true,
    },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(user);
}

type ProfilePayload = {
  firstName?: string;
  lastName?: string;
  email?: string;
  bio?: string | null;
  avatarUrl?: string | null;
};

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as ProfilePayload;

  const data: Record<string, unknown> = {};
  if (typeof body.firstName === "string") data.firstName = body.firstName.trim();
  if (typeof body.lastName === "string") data.lastName = body.lastName.trim();
  if (typeof body.email === "string") data.email = body.email.trim().toLowerCase();
  if (typeof body.bio === "string" || body.bio === null) data.bio = body.bio || null;
  if (typeof body.avatarUrl === "string" || body.avatarUrl === null) {
    data.avatarUrl = body.avatarUrl || null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No changes provided" }, { status: 400 });
  }

  if (typeof data.email === "string") {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }
    const existing = await authPrisma.user.findFirst({
      where: { email: data.email as string },
    });
    if (existing && existing.id !== session.user.id) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }
  }

  const updated = await authPrisma.user.update({
    where: { id: session.user.id },
    data,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      username: true,
      bio: true,
      avatarUrl: true,
    },
  });

  return NextResponse.json(updated);
}
