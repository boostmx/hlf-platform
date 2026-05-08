import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeSignals, evaluateTriggers, DEFAULT_THRESHOLDS } from "@/lib/signals";
import { evaluatePosition } from "@/lib/position-signals";
import { fetchWheelOpenPositions, isWheelTrackerConfigured } from "@/lib/wheel-tracker-client";
import type { WheelOpenPositions } from "@/lib/wheel-tracker-client";
import { sendDigest } from "@/lib/notify";
import Anthropic from "@anthropic-ai/sdk";
import type { Thresholds, TriggerType, Signals } from "@/lib/signals";
import type { AnyAlertType, AlertItem } from "@/lib/notify";

export const dynamic = "force-dynamic";

let _anthropic: Anthropic | null = null;
function getAnthropic() {
  if (!_anthropic) _anthropic = new Anthropic();
  return _anthropic;
}

function isCronAuthorized(req: NextRequest): boolean {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

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
      return `${symbol} broke above resistance — price $${price?.toFixed(2)}, RSI ${rsi}. Momentum shift, watch for CC opportunities.`;
    case "VOLUME_SURGE": {
      const multiple = signals.avgVolume20 ? (signals.latestVolume! / signals.avgVolume20).toFixed(1) : "?";
      return `${symbol} volume ${multiple}x average — price $${price?.toFixed(2)}, RSI ${rsi}. Unusual activity, directional move possible.`;
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
    } catch { /* fall through */ }
  }

  return buildFallbackMessage(symbol, triggerType, signals);
}

async function isDeduped(userId: string, tickerId: string, type: AnyAlertType): Promise<boolean> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const existing = await prisma.alert.findFirst({
    where: { userId, tickerId, type, sentAt: { gte: cutoff } },
    select: { id: true },
  });
  return existing !== null;
}

interface UserDigest {
  email: string;
  discordWebhook: string | null;
  emailEnabled: boolean;
  items: AlertItem[];
  dbRecords: { tickerId: string; type: AnyAlertType; signals: Signals; message: string }[];
}

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
          user: { select: { id: true, email: true, discordWebhook: true, emailEnabled: true, thresholds: true, watchedPortfolioIds: true } },
        },
      },
    },
  });

  // Collect unique users across all subscriptions
  const userMap = new Map<string, { id: string; email: string; discordWebhook: string | null; emailEnabled: boolean; watchedPortfolioIds: string[] | null }>();
  for (const ticker of tickers) {
    for (const sub of ticker.subscriptions) {
      if (!userMap.has(sub.user.id)) userMap.set(sub.user.id, {
        ...sub.user,
        watchedPortfolioIds: sub.user.watchedPortfolioIds as string[] | null,
      });
    }
  }

  // Batch-fetch open positions from wheel-strat-tracker for each user (by email)
  const positionsByUserId = new Map<string, WheelOpenPositions>();
  if (isWheelTrackerConfigured()) {
    await Promise.all(
      Array.from(userMap.values()).map(async (user) => {
        try {
          const positions = await fetchWheelOpenPositions(user.email);
          positionsByUserId.set(user.id, positions);
        } catch {
          positionsByUserId.set(user.id, { trades: [], stockLots: [] });
        }
      })
    );
  }

  // Load manual positions for all users in the map
  type ManualPos = { id: string; userId: string; positionType: string; contracts: number; strikePrice: number | null; premium: number | null; expirationDate: Date | null; openedAt: Date; ticker: { symbol: string } };
  const manualByUserId = new Map<string, ManualPos[]>();
  if (userMap.size > 0) {
    const rows = await prisma.userPosition.findMany({
      where: { userId: { in: Array.from(userMap.keys()) }, closedAt: null },
      select: { id: true, userId: true, positionType: true, contracts: true, strikePrice: true, premium: true, expirationDate: true, openedAt: true, ticker: { select: { symbol: true } } },
    }).catch(() => []);
    for (const row of rows) {
      if (!manualByUserId.has(row.userId)) manualByUserId.set(row.userId, []);
      manualByUserId.get(row.userId)!.push(row);
    }
  }

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

    // Entry signals — for subscribed users
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

    // Exit signals — from wheel-strat-tracker open positions (for any user who has positions in this ticker)
    if (signals.latestClose !== null) {
      for (const [userId, userPositions] of positionsByUserId) {
        const user = userMap.get(userId)!;

        const watchedIds = user.watchedPortfolioIds;
        const tickerTrades = userPositions.trades.filter((t) =>
          t.ticker === ticker.symbol && (!watchedIds?.length || watchedIds.includes(t.portfolioId))
        );
        const tickerLots = userPositions.stockLots.filter((l) =>
          l.ticker === ticker.symbol && (!watchedIds?.length || watchedIds.includes(l.portfolioId))
        );

        const TRACKER_TYPE_MAP: Record<string, "CSP" | "CC"> = {
          CashSecuredPut: "CSP", Put: "CSP",
          CoveredCall: "CC", Call: "CC",
        };

        for (const trade of tickerTrades) {
          const mappedType = TRACKER_TYPE_MAP[trade.type];
          if (!mappedType) continue;
          const posSignal = evaluatePosition(
            {
              positionType: mappedType,
              strikePrice: trade.strikePrice,
              premium: trade.contractPrice,
              contracts: trade.contractsOpen,
              expirationDate: new Date(trade.expirationDate),
              openedAt: new Date(trade.createdAt),
            },
            signals.latestClose
          );
          if (!posSignal) continue;
          if (await isDeduped(userId, ticker.id, posSignal.type)) continue;
          const digest = getDigest(userId, user);
          digest.items.push({ symbol: ticker.symbol, triggerType: posSignal.type, signals, message: posSignal.message });
          digest.dbRecords.push({ tickerId: ticker.id, type: posSignal.type, signals, message: posSignal.message });
        }

        for (const lot of tickerLots) {
          const posSignal = evaluatePosition(
            {
              positionType: "STOCK",
              strikePrice: null,
              premium: null,
              contracts: 1,
              expirationDate: null,
              openedAt: new Date(lot.openedAt),
            },
            signals.latestClose
          );
          if (!posSignal) continue;
          if (await isDeduped(userId, ticker.id, posSignal.type)) continue;
          const digest = getDigest(userId, user);
          digest.items.push({ symbol: ticker.symbol, triggerType: posSignal.type, signals, message: posSignal.message });
          digest.dbRecords.push({ tickerId: ticker.id, type: posSignal.type, signals, message: posSignal.message });
        }

        // Manual positions for this user and ticker
        const manualForTicker = (manualByUserId.get(userId) ?? [])
          .filter((p) => p.ticker.symbol === ticker.symbol);

        for (const pos of manualForTicker) {
          const posSignal = evaluatePosition(
            {
              positionType: pos.positionType as "CSP" | "CC" | "STOCK",
              strikePrice: pos.strikePrice,
              premium: pos.premium,
              contracts: pos.contracts,
              expirationDate: pos.expirationDate,
              openedAt: pos.openedAt,
            },
            signals.latestClose
          );
          if (!posSignal) continue;
          if (await isDeduped(userId, ticker.id, posSignal.type)) continue;
          const digest = getDigest(userId, user);
          digest.items.push({ symbol: ticker.symbol, triggerType: posSignal.type, signals, message: posSignal.message });
          digest.dbRecords.push({ tickerId: ticker.id, type: posSignal.type, signals, message: posSignal.message });
        }
      }
    }
  }

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

  return NextResponse.json({ ok: true, alertsSent, errors });
}
