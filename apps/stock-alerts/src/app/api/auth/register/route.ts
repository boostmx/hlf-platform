import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { authPrisma } from "@hlf/auth-db";
import { z } from "zod";

const schema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  username: z.string().min(3).max(40),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const { firstName, lastName, email, username, password } = parsed.data;

  const existing = await authPrisma.user.findFirst({
    where: { OR: [{ email: email.toLowerCase() }, { username }] },
  });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email or username already exists." },
      { status: 409 },
    );
  }

  const hashed = await bcrypt.hash(password, 10);
  await authPrisma.user.create({
    data: {
      firstName,
      lastName,
      email: email.toLowerCase(),
      username,
      password: hashed,
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
