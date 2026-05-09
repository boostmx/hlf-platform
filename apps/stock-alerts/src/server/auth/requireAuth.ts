import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/server/auth/auth";

type AuthResult =
  | { ok: true; userId: string; isAdmin: boolean; email: string }
  | { ok: false; response: NextResponse };

export async function requireAuth(): Promise<AuthResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return {
    ok: true,
    userId: session.user.id,
    isAdmin: Boolean(session.user.isAdmin),
    email: session.user.email,
  };
}

export async function requireAdmin(): Promise<AuthResult> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;
  if (!auth.isAdmin) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return auth;
}
