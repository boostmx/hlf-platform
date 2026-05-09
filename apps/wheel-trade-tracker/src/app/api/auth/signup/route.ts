// app/api/auth/signup/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { authPrisma } from "@hlf/auth-db";

export async function POST(req: Request) {
  const { firstName, lastName, email, username, password } = await req.json();

  if (!firstName || !lastName || !email || !username || !password) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  const existingUser = await authPrisma.user.findFirst({
    where: {
      OR: [{ username }, { email }],
    },
  });

  if (existingUser) {
    return NextResponse.json(
      { error: "Username or email already taken" },
      { status: 400 },
    );
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await authPrisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      username,
      password: hashedPassword,
    },
  });

  return NextResponse.json(
    { message: "User created", userId: newUser.id },
    { status: 201 },
  );
}
