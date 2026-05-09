export interface Bar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Signals {
  rsi14: number | null;
  sma50: number | null;
  sma200: number | null;
  supports: number[];
  resistances: number[];
  avgVolume20: number | null;
  latestVolume: number | null;
  latestClose: number | null;
}

// RSI-14 using Wilder's smoothing
export function computeRsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;

  const changes = closes.slice(1).map((c, i) => c - closes[i]!);
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < period; i++) {
    avgGain += Math.max(changes[i]!, 0);
    avgLoss += Math.max(-changes[i]!, 0);
  }
  avgGain /= period;
  avgLoss /= period;

  for (let i = period; i < changes.length; i++) {
    avgGain = (avgGain * (period - 1) + Math.max(changes[i]!, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-changes[i]!, 0)) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round((100 - 100 / (1 + rs)) * 100) / 100;
}

export function computeSma(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

// Find swing lows (support): price[i] is lower than N bars on each side
export function findSwingLows(bars: Bar[], lookback = 5, count = 3): number[] {
  const lows: number[] = [];
  for (let i = lookback; i < bars.length - lookback; i++) {
    const price = bars[i]!.low;
    const isSwingLow =
      bars.slice(i - lookback, i).every((b) => b.low >= price) &&
      bars.slice(i + 1, i + lookback + 1).every((b) => b.low >= price);
    if (isSwingLow) lows.push(price);
  }
  return lows.slice(-count).sort((a, b) => b - a);
}

// Find swing highs (resistance)
export function findSwingHighs(bars: Bar[], lookback = 5, count = 3): number[] {
  const highs: number[] = [];
  for (let i = lookback; i < bars.length - lookback; i++) {
    const price = bars[i]!.high;
    const isSwingHigh =
      bars.slice(i - lookback, i).every((b) => b.high <= price) &&
      bars.slice(i + 1, i + lookback + 1).every((b) => b.high <= price);
    if (isSwingHigh) highs.push(price);
  }
  return highs.slice(-count).sort((a, b) => a - b);
}

export function computeSignals(bars: Bar[]): Signals {
  if (bars.length === 0) {
    return {
      rsi14: null,
      sma50: null,
      sma200: null,
      supports: [],
      resistances: [],
      avgVolume20: null,
      latestVolume: null,
      latestClose: null,
    };
  }

  const closes = bars.map((b) => b.close);
  const volumes = bars.map((b) => b.volume);

  const rsi14 = computeRsi(closes);
  const sma50 = computeSma(closes, 50);
  const sma200 = computeSma(closes, 200);
  const supports = findSwingLows(bars);
  const resistances = findSwingHighs(bars);

  const recentVolumes = volumes.slice(-20);
  const avgVolume20 =
    recentVolumes.length > 0
      ? recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length
      : null;

  return {
    rsi14,
    sma50,
    sma200,
    supports,
    resistances,
    avgVolume20,
    latestVolume: volumes[volumes.length - 1] ?? null,
    latestClose: closes[closes.length - 1] ?? null,
  };
}

export interface Thresholds {
  rsiOversold: number;
  rsiOverbought: number;
  supportProximityPct: number;
  resistanceProximityPct: number;
  volumeSurgeMultiplier: number;
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  rsiOversold: 35,
  rsiOverbought: 65,
  supportProximityPct: 3,
  resistanceProximityPct: 3,
  volumeSurgeMultiplier: 2,
};

export type TriggerType =
  | "CSP_OPPORTUNITY"
  | "CC_OPPORTUNITY"
  | "SUPPORT_BREAK"
  | "RESISTANCE_BREAK"
  | "VOLUME_SURGE"
  | "SMA_CROSS_UP"
  | "SMA_CROSS_DOWN";

export function evaluateTriggers(
  signals: Signals,
  prevSignals: Signals | null,
  thresholds: Thresholds = DEFAULT_THRESHOLDS,
): TriggerType[] {
  const triggers: TriggerType[] = [];
  const { rsi14, sma50, supports, resistances, latestClose, latestVolume, avgVolume20 } = signals;

  if (latestClose === null) return triggers;

  if (rsi14 !== null && rsi14 <= thresholds.rsiOversold) {
    const nearSupport = supports.some(
      (s) => Math.abs(latestClose - s) / latestClose <= thresholds.supportProximityPct / 100,
    );
    if (nearSupport || supports.length === 0) triggers.push("CSP_OPPORTUNITY");
  }

  if (rsi14 !== null && rsi14 >= thresholds.rsiOverbought) {
    const nearResistance = resistances.some(
      (r) => Math.abs(latestClose - r) / latestClose <= thresholds.resistanceProximityPct / 100,
    );
    if (nearResistance || resistances.length === 0) triggers.push("CC_OPPORTUNITY");
  }

  if (supports.length > 0) {
    const nearestSupport = Math.max(...supports);
    if (latestClose < nearestSupport * 0.99) triggers.push("SUPPORT_BREAK");
  }

  if (resistances.length > 0) {
    const nearestResistance = Math.min(...resistances);
    if (latestClose > nearestResistance * 1.01) triggers.push("RESISTANCE_BREAK");
  }

  if (
    latestVolume !== null &&
    avgVolume20 !== null &&
    latestVolume > avgVolume20 * thresholds.volumeSurgeMultiplier
  ) {
    triggers.push("VOLUME_SURGE");
  }

  if (
    prevSignals !== null &&
    prevSignals.sma50 !== null &&
    sma50 !== null &&
    prevSignals.latestClose !== null
  ) {
    const wasBelowSma50 = prevSignals.latestClose < prevSignals.sma50;
    const nowAboveSma50 = latestClose > sma50;
    if (wasBelowSma50 && nowAboveSma50) triggers.push("SMA_CROSS_UP");

    const wasAboveSma50 = prevSignals.latestClose > prevSignals.sma50;
    const nowBelowSma50 = latestClose < sma50;
    if (wasAboveSma50 && nowBelowSma50) triggers.push("SMA_CROSS_DOWN");
  }

  return triggers;
}
