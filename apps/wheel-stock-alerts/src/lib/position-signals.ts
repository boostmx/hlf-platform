export type PositionAlertType = "PROFIT_TARGET" | "ASSIGNMENT_RISK" | "ROLL_OPPORTUNITY";

export interface PositionSignal {
  type: PositionAlertType;
  message: string;
}

export interface PositionForEval {
  positionType: "CSP" | "CC" | "STOCK";
  strikePrice: number | null;
  premium: number | null;
  contracts: number;
  expirationDate: Date | null;
  openedAt: Date;
}

export function evaluatePosition(
  position: PositionForEval,
  currentPrice: number
): PositionSignal | null {
  const { positionType, strikePrice, expirationDate, openedAt } = position;

  if (positionType === "STOCK" || !strikePrice || !expirationDate) return null;

  const now = Date.now();
  const dte = Math.max(0, Math.ceil((expirationDate.getTime() - now) / 86_400_000));
  const totalDays = Math.max(1, Math.ceil((expirationDate.getTime() - openedAt.getTime()) / 86_400_000));
  const timeDecayFraction = Math.min(1, (totalDays - dte) / totalDays);

  if (positionType === "CSP") {
    const pctAboveStrike = ((currentPrice - strikePrice) / strikePrice) * 100;

    // Assignment risk takes priority: price within 2% of strike or ITM with time left
    if (pctAboveStrike < 2 && dte <= 21) {
      const msg = pctAboveStrike < 0
        ? `CSP $${strikePrice} is ITM — price $${currentPrice.toFixed(2)} with ${dte} DTE. Assignment likely, consider closing or rolling.`
        : `CSP $${strikePrice} within ${pctAboveStrike.toFixed(1)}% of strike — price $${currentPrice.toFixed(2)} with ${dte} DTE. Monitor closely.`;
      return { type: "ASSIGNMENT_RISK", message: msg };
    }

    // Roll window: expiring soon and still comfortably OTM — capture more premium
    if (dte <= 7 && dte > 0 && pctAboveStrike >= 2) {
      return {
        type: "ROLL_OPPORTUNITY",
        message: `CSP $${strikePrice} expires in ${dte} day${dte === 1 ? "" : "s"} — price $${currentPrice.toFixed(2)} is ${pctAboveStrike.toFixed(1)}% OTM. Consider rolling out for more premium.`,
      };
    }

    // Profit target: price well OTM + enough time decay for ~25-50% profit
    if (pctAboveStrike >= 4 && timeDecayFraction >= 0.35 && dte > 0) {
      const estProfit = Math.min(75, Math.round(timeDecayFraction * 85));
      return {
        type: "PROFIT_TARGET",
        message: `CSP $${strikePrice} est. ~${estProfit}% profit — price $${currentPrice.toFixed(2)} is ${pctAboveStrike.toFixed(1)}% OTM with ${dte} DTE. Early close worth considering.`,
      };
    }
  }

  if (positionType === "CC") {
    const pctBelowStrike = ((strikePrice - currentPrice) / strikePrice) * 100;

    // Call-away risk: price approaching or above strike near expiry
    if (pctBelowStrike < 2 && dte <= 21) {
      const msg = pctBelowStrike < 0
        ? `CC $${strikePrice} is ITM — price $${currentPrice.toFixed(2)} with ${dte} DTE. Shares at risk of being called away, consider rolling.`
        : `CC $${strikePrice} within ${Math.abs(pctBelowStrike).toFixed(1)}% of strike — price $${currentPrice.toFixed(2)} with ${dte} DTE. Monitor for call-away.`;
      return { type: "ASSIGNMENT_RISK", message: msg };
    }

    // Roll window: expiring soon, price still below strike
    if (dte <= 7 && dte > 0 && pctBelowStrike >= 2) {
      return {
        type: "ROLL_OPPORTUNITY",
        message: `CC $${strikePrice} expires in ${dte} day${dte === 1 ? "" : "s"} — price $${currentPrice.toFixed(2)} is ${pctBelowStrike.toFixed(1)}% below strike. Consider rolling out for more premium.`,
      };
    }

    // Profit target: price well below strike + time decay
    if (pctBelowStrike >= 4 && timeDecayFraction >= 0.35 && dte > 0) {
      const estProfit = Math.min(75, Math.round(timeDecayFraction * 85));
      return {
        type: "PROFIT_TARGET",
        message: `CC $${strikePrice} est. ~${estProfit}% profit — price $${currentPrice.toFixed(2)} is ${pctBelowStrike.toFixed(1)}% below strike with ${dte} DTE. Early close worth considering.`,
      };
    }
  }

  return null;
}
