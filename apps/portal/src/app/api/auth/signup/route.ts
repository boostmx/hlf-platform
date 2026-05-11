import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { authPrisma } from "@hlf/auth-db";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!firstName || !lastName || !email || !username || !password) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 },
    );
  }

  const existing = await authPrisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Username or email already taken" },
      { status: 400 },
    );
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await authPrisma.user.create({
    data: { firstName, lastName, email, username, password: hashed },
  });

  return NextResponse.json({ ok: true, userId: user.id }, { status: 201 });
}
