import { Resend } from "resend";
import type { TriggerType, Signals } from "./signals";
import type { PositionAlertType } from "./position-signals";

export type AnyAlertType = TriggerType | PositionAlertType;

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

export interface AlertItem {
  symbol: string;
  triggerType: AnyAlertType;
  signals: Signals;
  message: string;
}

export interface DigestPayload {
  userId: string;
  userEmail: string;
  discordWebhook?: string | null;
  emailEnabled: boolean;
  alerts: AlertItem[];
}

export interface AlertPayload {
  userId: string;
  userEmail: string;
  discordWebhook?: string | null;
  emailEnabled: boolean;
  symbol: string;
  triggerType: AnyAlertType;
  signals: Signals;
  message: string;
}

const TRIGGER_LABELS: Record<AnyAlertType, string> = {
  CSP_OPPORTUNITY: "CSP Opportunity",
  CC_OPPORTUNITY: "CC Opportunity",
  SUPPORT_BREAK: "Support Break",
  RESISTANCE_BREAK: "Resistance Breakout",
  VOLUME_SURGE: "Volume Surge",
  SMA_CROSS_UP: "SMA Bullish Cross",
  SMA_CROSS_DOWN: "SMA Bearish Cross",
  PROFIT_TARGET: "Profit Target",
  ASSIGNMENT_RISK: "Assignment Risk",
  ROLL_OPPORTUNITY: "Roll Opportunity",
};

const ALERT_COLORS: Record<AnyAlertType, { hex: string; discord: number; border: string }> = {
  CSP_OPPORTUNITY: { hex: "#10b981", discord: 0x10b981, border: "#10b981" },
  CC_OPPORTUNITY: { hex: "#0ea5e9", discord: 0x0ea5e9, border: "#0ea5e9" },
  SUPPORT_BREAK: { hex: "#ef4444", discord: 0xef4444, border: "#ef4444" },
  RESISTANCE_BREAK: { hex: "#f59e0b", discord: 0xf59e0b, border: "#f59e0b" },
  VOLUME_SURGE: { hex: "#8b5cf6", discord: 0x8b5cf6, border: "#8b5cf6" },
  SMA_CROSS_UP: { hex: "#14b8a6", discord: 0x14b8a6, border: "#14b8a6" },
  SMA_CROSS_DOWN: { hex: "#f97316", discord: 0xf97316, border: "#f97316" },
  PROFIT_TARGET: { hex: "#10b981", discord: 0x10b981, border: "#10b981" },
  ASSIGNMENT_RISK: { hex: "#ef4444", discord: 0xef4444, border: "#ef4444" },
  ROLL_OPPORTUNITY: { hex: "#6366f1", discord: 0x6366f1, border: "#6366f1" },
};

export async function sendDigest(payload: DigestPayload): Promise<string[]> {
  const channels: string[] = [];
  await Promise.allSettled([
    payload.emailEnabled && sendDigestEmail(payload).then(() => channels.push("email")),
    payload.discordWebhook && sendDigestDiscord(payload).then(() => channels.push("discord")),
  ]);
  return channels;
}

export async function sendAlerts(payload: AlertPayload): Promise<string[]> {
  return sendDigest({
    userId: payload.userId,
    userEmail: payload.userEmail,
    discordWebhook: payload.discordWebhook,
    emailEnabled: payload.emailEnabled,
    alerts: [
      {
        symbol: payload.symbol,
        triggerType: payload.triggerType,
        signals: payload.signals,
        message: payload.message,
      },
    ],
  });
}

function pill(label: string, value: string): string {
  return `<span style="display:inline-flex;align-items:center;gap:4px;background:#1e1b2e;border:1px solid #2d2a42;border-radius:6px;padding:3px 8px;margin:2px 3px 2px 0;font-size:11px;white-space:nowrap;">
    <span style="color:#8b8aa0;">${label}</span>
    <span style="color:#e2e0f0;font-weight:600;">${value}</span>
  </span>`;
}

function signalRows(signals: Signals): string {
  const rows: string[] = [];
  if (signals.rsi14 !== null) rows.push(pill("RSI (14)", String(signals.rsi14)));
  if (signals.latestClose !== null) rows.push(pill("Price", `$${signals.latestClose.toFixed(2)}`));
  if (signals.supports.length > 0)
    rows.push(pill("Support", signals.supports.map((s) => `$${s.toFixed(2)}`).join(" / ")));
  if (signals.resistances.length > 0)
    rows.push(
      pill("Resistance", signals.resistances.map((r) => `$${r.toFixed(2)}`).join(" / ")),
    );
  if (signals.sma50 !== null) rows.push(pill("50 SMA", `$${signals.sma50.toFixed(2)}`));
  if (signals.sma200 !== null) rows.push(pill("200 SMA", `$${signals.sma200.toFixed(2)}`));
  if (signals.latestVolume !== null && signals.avgVolume20 !== null)
    rows.push(
      pill(
        "Volume",
        `${(signals.latestVolume / 1_000_000).toFixed(1)}M (${(
          signals.latestVolume / signals.avgVolume20
        ).toFixed(1)}x avg)`,
      ),
    );
  return rows.join("");
}

function alertCard(item: AlertItem): string {
  const label = TRIGGER_LABELS[item.triggerType];
  const color = ALERT_COLORS[item.triggerType].hex;
  return `
  <div style="border:1px solid #2d2a42;border-left:4px solid ${color};border-radius:8px;padding:16px;margin-bottom:12px;background:#13111f;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap;">
      <span style="font-size:16px;font-weight:700;color:#e2e0f0;">${item.symbol}</span>
      <span style="background:${color}22;color:${color};border:1px solid ${color}44;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:600;">${label}</span>
    </div>
    <p style="color:#a09dbf;font-size:14px;margin:0 0 10px;line-height:1.5;">${item.message}</p>
    <div style="margin-top:8px;">${signalRows(item.signals)}</div>
  </div>`;
}

async function sendDigestEmail(payload: DigestPayload) {
  const count = payload.alerts.length;
  const tickers = [...new Set(payload.alerts.map((a) => a.symbol))].join(", ");
  const subject =
    count === 1
      ? `HLF Stock Alerts — ${payload.alerts[0]!.symbol} · ${TRIGGER_LABELS[payload.alerts[0]!.triggerType]}`
      : `HLF Stock Alerts — ${count} signals today (${tickers})`;

  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0914;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid #2d2a42;">
      <div style="width:36px;height:36px;background:#f59e0b22;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <span style="font-size:18px;">🔔</span>
      </div>
      <div>
        <p style="margin:0;font-size:15px;font-weight:700;color:#e2e0f0;">HLF Stock Alerts</p>
        <p style="margin:0;font-size:12px;color:#8b8aa0;">${date}</p>
      </div>
      <div style="margin-left:auto;background:#f59e0b22;border:1px solid #f59e0b44;border-radius:6px;padding:4px 10px;">
        <span style="font-size:12px;font-weight:600;color:#fbbf24;">${count} signal${count !== 1 ? "s" : ""}</span>
      </div>
    </div>
    ${payload.alerts.map(alertCard).join("")}
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid #2d2a42;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
      <p style="margin:0;font-size:11px;color:#5b5875;">Signals are based on daily closing data.</p>
      <a href="${process.env.NEXTAUTH_URL}/settings" style="font-size:11px;color:#7c6fa0;text-decoration:none;">Manage preferences</a>
    </div>
  </div>
</body>
</html>`;

  await getResend().emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: payload.userEmail,
    subject,
    html,
  });
}

async function sendDigestDiscord(payload: DigestPayload) {
  const embeds = payload.alerts.slice(0, 10).map((item) => {
    const label = TRIGGER_LABELS[item.triggerType];
    const color = ALERT_COLORS[item.triggerType].discord;

    const fields: Array<{ name: string; value: string; inline: boolean }> = [];
    if (item.signals.rsi14 !== null)
      fields.push({ name: "RSI (14)", value: `${item.signals.rsi14}`, inline: true });
    if (item.signals.latestClose !== null)
      fields.push({ name: "Price", value: `$${item.signals.latestClose.toFixed(2)}`, inline: true });
    if (item.signals.supports.length > 0)
      fields.push({
        name: "Support",
        value: item.signals.supports.map((s) => `$${s.toFixed(2)}`).join(" / "),
        inline: true,
      });
    if (item.signals.resistances.length > 0)
      fields.push({
        name: "Resistance",
        value: item.signals.resistances.map((r) => `$${r.toFixed(2)}`).join(" / "),
        inline: true,
      });
    if (item.signals.sma50 !== null)
      fields.push({ name: "50 SMA", value: `$${item.signals.sma50.toFixed(2)}`, inline: true });
    if (item.signals.latestVolume !== null && item.signals.avgVolume20 !== null)
      fields.push({
        name: "Volume",
        value: `${(item.signals.latestVolume / 1_000_000).toFixed(1)}M (${(
          item.signals.latestVolume / item.signals.avgVolume20
        ).toFixed(1)}x avg)`,
        inline: true,
      });

    return { title: `${item.symbol} — ${label}`, description: item.message, color, fields };
  });

  const date = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const count = payload.alerts.length;

  await fetch(payload.discordWebhook!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: `**HLF Stock Alerts** · ${date} · ${count} signal${count !== 1 ? "s" : ""}`,
      embeds,
    }),
  });
}
