import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchDailyBars } from "@/lib/alpaca";
import { computeSignals, evaluateTriggers, DEFAULT_THRESHOLDS } from "@/lib/signals";
import { evaluatePosition } from "@/lib/position-signals";
import { sendDigest, type AlertItem } from "@/lib/notify";
import { format, subDays } from "date-fns";
import Anthropic from "@anthropic-ai/sdk";
import type { Thresholds, TriggerType, Signals } from "@/lib/signals";

// Vercel Cron: runs once daily at 5:00pm ET (22:00 UTC) Mon-Fri
// vercel.json: { "crons": [{ "path": "/api/cron/daily", "schedule": "0 22 * * 1-5" }] }

export const dynamic = "force-dynamic";

let _anthropic: Anthropic | null = null;
function getAnthropic() {
  if (!_anthropic) _anthropic = new Anthropic();
  return _anthropic;
}

function isCronAuthorized(req: NextRequest): boolean {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

// ─── Bar ingestion ────────────────────────────────────────────────────────────

async function runFetchBars(): Promise<{ fetched: number; errors: string[] }> {
  const tickers = await prisma.ticker.findMany({
    where: { isApproved: true },
    select: { id: true, symbol: true },
  });

  const endDate = format(new Date(), "yyyy-MM-dd");
  const startDate = format(subDays(new Date(), 220), "yyyy-MM-dd");

  let fetched = 0;
  const errors: string[] = [];

  for (const ticker of tickers) {
    try {
      const bars = await fetchDailyBars(ticker.symbol, startDate, endDate);

      for (const bar of bars) {
        await prisma.priceBar.upsert({
          where: { tickerId_date: { tickerId: ticker.id, date: new Date(bar.date + "T00:00:00Z") } },
          update: { open: bar.open, high: bar.high, low: bar.low, close: bar.close, volume: bar.volume },
          create: {
            tickerId: ticker.id,
            date: new Date(bar.date + "T00:00:00Z"),
            open: bar.open, high: bar.high, low: bar.low, close: bar.close,
            volume: BigInt(Math.round(bar.volume)),
          },
        });
      }

      const latest = bars[bars.length - 1];
      if (latest) {
        await prisma.ticker.update({
          where: { id: ticker.id },
          data: { lastPrice: latest.close, lastUpdated: new Date() },
        });
      }

      fetched += bars.length;
    } catch (err) {
      errors.push(`${ticker.symbol}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { fetched, errors };
}

// ─── Alert generation ─────────────────────────────────────────────────────────

function buildFallbackMessage(symbol: string, triggerType: TriggerType, signals: Signals): string {
  const price = signals.latestClose;
  const rsi = signals.rsi14;
  const nearestSupport = signals.supports.length > 0 ? Math.max(...signals.supports) : null;
  const nearestResistance = signals.resistances.length > 0 ? Math.min(...signals.resistances) : null;

  switch (triggerType) {
    case "CSP_OPPORTUNITY": {
      const strike = nearestSupport ? Math.floor(nearestSupport * 0.97 / 5) * 5 : null;
      return `${symbol} CSP opportunity — RSI ${rsi} at $${price?.toFixed(2)}${nearestSupport ? `, price ${((price! - nearestSupport) / price! * 100).toFixed(1)}% above $${nearestSupport.toFixed(2)} support` : ""}${strike ? `. Consider ~$${strike} strike.` : "."}`;
    }
    case "CC_OPPORTUNITY": {
      const strike = nearestResistance ? Math.ceil(nearestResistance * 1.02 / 5) * 5 : null;
      return `${symbol} CC opportunity — RSI ${rsi} at $${price?.toFixed(2)}${nearestResistance ? `, price ${((nearestResistance - price!) / price! * 100).toFixed(1)}% below $${nearestResistance.toFixed(2)} resistance` : ""}${strike ? `. Consider ~$${strike} strike.` : "."}`;
    }
    case "SUPPORT_BREAK":
      return `${symbol} broke below support — price $${price?.toFixed(2)}, RSI ${rsi}. Elevated risk for open CSPs.`;
    case "RESISTANCE_BREAK":
      return `${symbol} broke above resistance — price $${price?.toFixed(2)}, RSI ${rsi}. Watch for CC opportunities.`;
    case "VOLUME_SURGE": {
      const multiple = signals.avgVolume20 ? (signals.latestVolume! / signals.avgVolume20).toFixed(1) : "?";
      return `${symbol} volume ${multiple}x average — price $${price?.toFixed(2)}, RSI ${rsi}. Directional move possible.`;
    }
    case "SMA_CROSS_UP":
      return `${symbol} crossed above 50 SMA ($${signals.sma50?.toFixed(2)}) — RSI ${rsi}. Bullish trend signal.`;
    case "SMA_CROSS_DOWN":
      return `${symbol} crossed below 50 SMA ($${signals.sma50?.toFixed(2)}) — RSI ${rsi}. Bearish trend signal.`;
    default:
      return `${symbol}: signal detected. Price $${price?.toFixed(2)}, RSI ${rsi}.`;
  }
}

async function generateEntryAlertMessage(symbol: string, triggerType: TriggerType, signals: Signals): Promise<string> {
  const price = signals.latestClose;
  const nearestSupport = signals.supports.length > 0 ? Math.max(...signals.supports) : null;
  const nearestResistance = signals.resistances.length > 0 ? Math.min(...signals.resistances) : null;

  const parts: string[] = [];
  if (signals.rsi14 !== null) parts.push(`RSI(14): ${signals.rsi14}`);
  if (price !== null) parts.push(`Price: $${price.toFixed(2)}`);
  if (signals.sma50 !== null) parts.push(`50 SMA: $${signals.sma50.toFixed(2)}`);
  if (signals.sma200 !== null) parts.push(`200 SMA: $${signals.sma200.toFixed(2)}`);
  if (nearestSupport !== null && price !== null)
    parts.push(`Nearest support: $${nearestSupport.toFixed(2)} (${((price - nearestSupport) / price * 100).toFixed(1)}% below price)`);
  if (nearestResistance !== null && price !== null)
    parts.push(`Nearest resistance: $${nearestResistance.toFixed(2)} (${((nearestResistance - price) / price * 100).toFixed(1)}% above price)`);
  if (signals.latestVolume !== null && signals.avgVolume20 !== null)
    parts.push(`Volume: ${(signals.latestVolume / 1_000_000).toFixed(1)}M (${(signals.latestVolume / signals.avgVolume20).toFixed(1)}x avg)`);

  let strikeContext = "";
  if (triggerType === "CSP_OPPORTUNITY" && nearestSupport !== null)
    strikeContext = `\nSuggested CSP strike zone: ~$${Math.floor(nearestSupport * 0.97 / 5) * 5} (3-5% below $${nearestSupport.toFixed(0)} support)`;
  else if (triggerType === "CC_OPPORTUNITY" && nearestResistance !== null)
    strikeContext = `\nSuggested CC strike zone: ~$${Math.ceil(nearestResistance * 1.02 / 5) * 5} (2-3% above $${nearestResistance.toFixed(0)} resistance)`;

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const response = await getAnthropic().messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 150,
        messages: [{
          role: "user",
          content: `You are a concise wheel strategy analyst. Write a 1-2 sentence alert for an options wheel trader.
Ticker: ${symbol}
Signal: ${triggerType}
Data: ${parts.join(" | ")}${strikeContext}
Include the specific RSI value, the key price level, and the suggested strike if applicable. No disclaimers. Max 150 chars.
Example: "RSI 31 near $141 support — consider $137-140 CSP for upcoming expiry."`,
        }],
      });
      const text = response.content[0].type === "text" ? response.content[0].text.trim() : null;
      if (text) return text;
    } catch {
      // fall through to template
    }
  }

  return buildFallbackMessage(symbol, triggerType, signals);
}

type AlertType = import("@/lib/notify").AnyAlertType;

async function isDeduped(userId: string, tickerId: string, type: AlertType): Promise<boolean> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const existing = await prisma.alert.findFirst({
    where: { userId, tickerId, type, sentAt: { gte: cutoff } },
    select: { id: true },
  });
  return existing !== null;
}

// ─── Signal scan ──────────────────────────────────────────────────────────────

interface UserDigest {
  email: string;
  discordWebhook: string | null;
  emailEnabled: boolean;
  items: AlertItem[];
  dbRecords: { tickerId: string; type: AlertType; signals: Signals; message: string }[];
}

async function runScan(): Promise<{ alertsSent: number; errors: string[] }> {
  const tickers = await prisma.ticker.findMany({
    where: { isApproved: true },
    include: {
      priceBars: {
        orderBy: { date: "asc" },
        take: 220,
        select: { date: true, open: true, high: true, low: true, close: true, volume: true },
      },
      subscriptions: {
        include: {
          user: { select: { id: true, email: true, discordWebhook: true, emailEnabled: true, thresholds: true } },
        },
      },
      positions: {
        where: { closedAt: null },
        include: {
          user: { select: { id: true, email: true, discordWebhook: true, emailEnabled: true } },
        },
      },
    },
  });

  // Collect all alerts per user before dispatching
  const userDigests = new Map<string, UserDigest>();

  function getDigest(userId: string, user: { email: string; discordWebhook: string | null; emailEnabled: boolean }): UserDigest {
    if (!userDigests.has(userId)) {
      userDigests.set(userId, { email: user.email, discordWebhook: user.discordWebhook, emailEnabled: user.emailEnabled, items: [], dbRecords: [] });
    }
    return userDigests.get(userId)!;
  }

  for (const ticker of tickers) {
    if (ticker.priceBars.length < 15) continue;

    const bars = ticker.priceBars.map((b) => ({
      date: b.date.toISOString().slice(0, 10),
      open: b.open, high: b.high, low: b.low, close: b.close, volume: Number(b.volume),
    }));

    const signals = computeSignals(bars);
    const prevSignals = bars.length >= 16 ? computeSignals(bars.slice(0, -1)) : null;

    // Market signal alerts
    for (const sub of ticker.subscriptions) {
      const user = sub.user;
      const thresholds: Thresholds = (user.thresholds as Thresholds | null) ?? DEFAULT_THRESHOLDS;
      const triggers = evaluateTriggers(signals, prevSignals, thresholds);

      for (const trigger of triggers) {
        if (await isDeduped(user.id, ticker.id, trigger)) continue;
        const message = await generateEntryAlertMessage(ticker.symbol, trigger, signals);
        const digest = getDigest(user.id, user);
        digest.items.push({ symbol: ticker.symbol, triggerType: trigger, signals, message });
        digest.dbRecords.push({ tickerId: ticker.id, type: trigger, signals, message });
      }
    }

    // Position-aware exit alerts
    if (signals.latestClose !== null) {
      for (const position of ticker.positions) {
        const posSignal = evaluatePosition(
          { positionType: position.positionType as "CSP" | "CC" | "STOCK", strikePrice: position.strikePrice, premium: position.premium, contracts: position.contracts, expirationDate: position.expirationDate, openedAt: position.openedAt },
          signals.latestClose
        );
        if (!posSignal) continue;
        if (await isDeduped(position.user.id, ticker.id, posSignal.type)) continue;
        const digest = getDigest(position.user.id, position.user);
        digest.items.push({ symbol: ticker.symbol, triggerType: posSignal.type, signals, message: posSignal.message });
        digest.dbRecords.push({ tickerId: ticker.id, type: posSignal.type, signals, message: posSignal.message });
      }
    }
  }

  // Dispatch one digest per user, then write DB records
  let alertsSent = 0;
  const errors: string[] = [];

  for (const [userId, digest] of userDigests) {
    if (digest.items.length === 0) continue;
    try {
      const channels = await sendDigest({
        userId, userEmail: digest.email,
        discordWebhook: digest.discordWebhook,
        emailEnabled: digest.emailEnabled,
        alerts: digest.items,
      });
      const channelStr = channels.join(",") || "none";
      for (const rec of digest.dbRecords) {
        await prisma.alert.create({
          data: { userId, tickerId: rec.tickerId, type: rec.type, signals: rec.signals as object, message: rec.message, channel: channelStr },
        });
      }
      alertsSent += digest.items.length;
    } catch (err) {
      errors.push(`digest→${digest.email}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { alertsSent, errors };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bars = await runFetchBars();
  const scan = await runScan();

  return NextResponse.json({
    ok: true,
    bars: { fetched: bars.fetched, errors: bars.errors },
    scan: { alertsSent: scan.alertsSent, errors: scan.errors },
  });
}
