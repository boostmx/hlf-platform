import type { NextConfig } from "next";
import { execSync } from "node:child_process";
import pkg from "./package.json";

function safe(cmd: string, fallback = "") {
  try {
    return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return fallback;
  }
}

const sha =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 9) ||
  process.env.GITHUB_SHA?.slice(0, 9) ||
  safe("git rev-parse --short=9 HEAD", "local");

const baseVersion = (pkg as { version?: string }).version ?? "0.0.0";
const fullVersion =
  process.env.NODE_ENV === "production"
    ? `${baseVersion}.${sha}`
    : `${baseVersion}-dev.${sha}`;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: { NEXT_PUBLIC_APP_VERSION: fullVersion },
  // Force Next's file tracer to bundle the Prisma query engine binary from
  // @hlf/auth-db into every serverless function. The other apps don't need
  // this because they each generate their own Prisma client locally, so the
  // binary lands in apps/<app>/src/generated/prisma/ and Next traces it
  // naturally. Portal has no Prisma of its own — it only uses authPrisma —
  // so the cross-package binary has to be pulled in explicitly.
  outputFileTracingIncludes: {
    "*": ["../../packages/auth-db/src/generated/prisma/**/*"],
  },
};

export default nextConfig;
