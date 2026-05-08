import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/requireAdmin";
import { fetchWheelPortfolios } from "@/lib/wheel-tracker-client";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const portfolios = await fetchWheelPortfolios(auth.userId);
    return NextResponse.json(portfolios);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
