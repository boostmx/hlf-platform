import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.toUpperCase().trim();
  if (!symbol) return NextResponse.json({ error: "Symbol is required." }, { status: 400 });

  const res = await fetch(`${process.env.ALPACA_BASE_URL}/assets/${symbol}`, {
    headers: {
      "APCA-API-KEY-ID": process.env.ALPACA_API_KEY!,
      "APCA-API-SECRET-KEY": process.env.ALPACA_SECRET_KEY!,
    },
  });

  if (!res.ok) {
    return NextResponse.json({
      valid: false,
      error: `"${symbol}" wasn't found on Alpaca. Check the symbol and try again.`,
    });
  }

  const asset = await res.json();

  if (asset.status !== "active" || !asset.tradable) {
    return NextResponse.json({
      valid: false,
      error: `"${symbol}" is not an actively traded symbol.`,
    });
  }

  return NextResponse.json({
    valid: true,
    symbol: asset.symbol,
    name: asset.name,
    exchange: asset.exchange,
  });
}
