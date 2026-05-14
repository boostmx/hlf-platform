import { NextRequest, NextResponse } from "next/server";
import { runAlertScan } from "@/lib/alerts/engine";

// Entry point for the GitHub Actions cron. Bearer-guarded by ALERTS_SCAN_SECRET.
// Idempotent — safe to re-run; dedup window in the engine prevents repeat fires.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const expected = process.env.ALERTS_SCAN_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "ALERTS_SCAN_SECRET not configured" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runAlertScan();
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "scan failed";
    console.error("[alerts/scan]", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
