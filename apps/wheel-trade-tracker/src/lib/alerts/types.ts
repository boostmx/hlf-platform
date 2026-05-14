import { z } from "zod";

// Zod schemas for AlertConfig.params, keyed by config type. The scan engine
// validates with these before evaluating; the API uses them when creating /
// updating configs.

export const profitTargetParams = z.object({
  profitPct: z.number().min(1).max(99),
});

export const assignmentRiskParams = z.object({
  withinPctOfStrike: z.number().min(0).max(50),
  maxDte: z.number().int().min(0).max(365),
});

export const rollOpportunityParams = z.object({
  maxDte: z.number().int().min(0).max(60),
  minOtmPct: z.number().min(0).max(50),
});

export const watchlistBreachParams = z.object({
  triggerPrice: z.number().positive(),
  direction: z.enum(["below", "above"]),
});

export type ProfitTargetParams = z.infer<typeof profitTargetParams>;
export type AssignmentRiskParams = z.infer<typeof assignmentRiskParams>;
export type RollOpportunityParams = z.infer<typeof rollOpportunityParams>;
export type WatchlistBreachParams = z.infer<typeof watchlistBreachParams>;

export const paramsByType = {
  PROFIT_TARGET: profitTargetParams,
  ASSIGNMENT_RISK: assignmentRiskParams,
  ROLL_OPPORTUNITY: rollOpportunityParams,
  WATCHLIST_BREACH: watchlistBreachParams,
} as const;

export type AlertConfigType = keyof typeof paramsByType;

export const ALERT_TYPE_LABEL: Record<AlertConfigType, string> = {
  PROFIT_TARGET: "Profit target",
  ASSIGNMENT_RISK: "Assignment risk",
  ROLL_OPPORTUNITY: "Roll opportunity",
  WATCHLIST_BREACH: "Watchlist trigger",
};

export function describeConfig(type: AlertConfigType, params: unknown): string {
  const p = (params ?? {}) as Record<string, unknown>;
  switch (type) {
    case "PROFIT_TARGET":
      return `≥ ${p.profitPct ?? "?"}% est. profit`;
    case "ASSIGNMENT_RISK":
      return `within ${p.withinPctOfStrike ?? "?"}% of strike · ≤ ${p.maxDte ?? "?"} DTE`;
    case "ROLL_OPPORTUNITY":
      return `≤ ${p.maxDte ?? "?"} DTE · ≥ ${p.minOtmPct ?? "?"}% OTM`;
    case "WATCHLIST_BREACH":
      return `price ${p.direction === "above" ? "≥" : "≤"} $${
        typeof p.triggerPrice === "number" ? p.triggerPrice.toFixed(2) : "?"
      }`;
  }
}
