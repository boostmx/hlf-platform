import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcrypt";
import { authPrisma } from "@hlf/auth-db";
import { authOptions } from "@/server/auth/auth";

type Payload = {
  currentPassword?: string;
  newPassword?: string;
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { currentPassword, newPassword } = (await req
    .json()
    .catch(() => ({}))) as Payload;

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Current and new passwords are required" },
      { status: 400 },
    );
  }
  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "New password must be at least 8 characters" },
      { status: 400 },
    );
  }

  const user = await authPrisma.user.findUnique({
    where: { id: session.user.id },
    select: { password: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ok = await bcrypt.compare(currentPassword, user.password);
  if (!ok) {
    return NextResponse.json(
      { error: "Current password is incorrect" },
      { status: 400 },
    );
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await authPrisma.user.update({
    where: { id: session.user.id },
    data: { password: hashed },
  });

  return NextResponse.json({ ok: true });
}
