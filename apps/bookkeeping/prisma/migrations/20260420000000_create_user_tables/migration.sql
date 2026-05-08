-- Creates User table for a standalone bookkeeping DB.
-- Uses IF NOT EXISTS — safe to run on the existing shared DB as a no-op.

CREATE TABLE IF NOT EXISTS "User" (
  "id"        TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName"  TEXT NOT NULL,
  "email"     TEXT NOT NULL,
  "bio"       TEXT,
  "avatarUrl" TEXT,
  "isAdmin"   BOOLEAN NOT NULL DEFAULT false,
  "username"  TEXT NOT NULL,
  "password"  TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key"    ON "User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");
