import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authPrisma } from "@hlf/auth-db";
import { authOptions } from "@/server/auth/auth";
import { fetchWheelPortfolios } from "@/lib/clients/wheel-portfolios";

// Stored as "all" or a CSV of portfolio IDs. Empty selection falls back to "all".
function serialize(selection: string[] | "all"): string {
  if (selection === "all" || selection.length === 0) return "all";
  return selection.join(",");
}

function parse(value: string): "all" | string[] {
  if (!value || value === "all") return "all";
  const ids = value.split(",").filter(Boolean);
  return ids.length === 0 ? "all" : ids;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user, portfolios] = await Promise.all([
    authPrisma.user.findUnique({
      where: { id: session.user.id },
      select: { tradingPortfolios: true },
    }),
    fetchWheelPortfolios(session.user.id),
  ]);

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    selection: parse(user.tradingPortfolios),
    available: portfolios.data ?? [],
    availableError: portfolios.error,
  });
}

type Payload = {
  selection?: "all" | string[];
};

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Payload;
  const raw = body.selection;

  let normalized: "all" | string[];
  if (raw === "all" || raw == null) {
    normalized = "all";
  } else if (Array.isArray(raw) && raw.every((s) => typeof s === "string")) {
    normalized = raw.filter((s) => s.trim().length > 0);
  } else {
    return NextResponse.json(
      { error: 'selection must be "all" or string[]' },
      { status: 400 },
    );
  }

  await authPrisma.user.update({
    where: { id: session.user.id },
    data: { tradingPortfolios: serialize(normalized) },
  });

  return NextResponse.json({ selection: normalized === "all" ? "all" : normalized });
}
