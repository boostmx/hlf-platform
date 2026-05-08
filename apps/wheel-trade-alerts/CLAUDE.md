# hlf-wheel-alerts — Claude Context

Standalone stock ticker alert app for wheel strategy traders. Separate from the HLF suite (own Railway DB, own NextAuth instance, own Vercel project). Alerts users via email (Resend) and Discord webhooks when RSI, support/resistance, SMA, or volume signals fire on subscribed tickers.

---

## Stack

Next.js 16 (App Router) · TypeScript 5 strict · Prisma 7 · NextAuth 4 (credentials, JWT) · Tailwind CSS v4 · shadcn/ui (New York, slate) · Alpaca Markets API (market data) · Anthropic Claude API (alert message generation) · Resend (email) · Vercel Cron (scheduled scans)

## Brand

Primary: amber/orange `oklch(0.55 0.19 38)` · Accent: amber `oklch(0.84 0.14 72)` · shadcn slate base

---

## Database rules

- **Own Railway PostgreSQL DB** — not shared with the HLF suite
- Use `prisma migrate deploy` (never `prisma db push`)
- New schema changes: write SQL in `prisma/migrations/TIMESTAMP_name/migration.sql`, run `pnpm db:migrate`, update `prisma/schema.prisma`, run `pnpm db:generate`

---

## Architecture

### Data flow
1. **`/api/cron/fetch-bars`** (daily, 4:45pm ET) — pulls OHLCV from Alpaca for all approved tickers, upserts into `PriceBar`
2. **`/api/cron/scan`** (every 30min, market hours) — computes signals from stored bars, evaluates per-user thresholds, calls Claude Haiku for message generation, dispatches via Resend + Discord webhook, records in `Alert`

### Signal engine (`src/lib/signals.ts`)
- **RSI(14)** — Wilder's smoothing. Oversold threshold (default 35) → CSP_OPPORTUNITY. Overbought (default 65) → CC_OPPORTUNITY.
- **SMA 50/200** — crossing triggers SMA_CROSS_UP / SMA_CROSS_DOWN
- **Support/Resistance** — swing high/low detection (5-bar lookback). Near support + oversold RSI = CSP signal. Near resistance = CC signal.
- **Volume surge** — today > 2x 20-day average → VOLUME_SURGE

### Alert deduplication
One alert per (user × ticker × type) per 24 hours. Checked before generation and dispatch.

### Claude Haiku usage
Called per trigger evaluation to generate a concise single-sentence alert message. Falls back to a template string if the API call fails. Uses `claude-haiku-4-5-20251001`.

---

## Key files

```
src/
├── app/
│   ├── (auth)/sign-in|sign-up/       Auth pages
│   ├── (app)/
│   │   ├── dashboard/                Recent alerts + subscribed tickers
│   │   ├── tickers/                  Browse + subscribe to approved tickers
│   │   ├── alerts/                   Full alert history
│   │   ├── settings/                 Notification prefs + thresholds
│   │   └── admin/                    Ticker management (ADMIN only)
│   └── api/
│       ├── auth/[...nextauth]/       NextAuth handler
│       ├── auth/register/            User registration
│       ├── subscriptions/            POST/DELETE ticker subscriptions
│       ├── settings/                 PATCH user settings
│       ├── settings/test-discord/    Test Discord webhook
│       ├── admin/tickers/            Admin ticker CRUD
│       ├── cron/fetch-bars/          Daily bar ingestion from Alpaca
│       └── cron/scan/                Signal scan + alert dispatch
├── lib/
│   ├── alpaca.ts                     Alpaca API client wrapper
│   ├── signals.ts                    RSI, SMA, swing high/low, trigger evaluation
│   ├── notify.ts                     Email (Resend) + Discord webhook dispatch
│   ├── auth.ts                       NextAuth config
│   └── prisma.ts                     Prisma client singleton
prisma/
├── schema.prisma                     DB schema
└── seed.ts                           30-ticker wheel universe + admin user
vercel.json                           Cron schedules
```

---

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Own Railway PostgreSQL |
| `NEXTAUTH_SECRET` | JWT signing |
| `NEXTAUTH_URL` | App domain |
| `ALPACA_API_KEY` | Alpaca Markets data |
| `ALPACA_SECRET_KEY` | Alpaca Markets data |
| `ALPACA_BASE_URL` | `https://paper-api.alpaca.markets` |
| `ALPACA_DATA_URL` | `https://data.alpaca.markets` |
| `ANTHROPIC_API_KEY` | Claude Haiku for alert messages |
| `RESEND_API_KEY` | Email delivery |
| `RESEND_FROM_EMAIL` | Sender address |
| `CRON_SECRET` | Auth header for cron endpoints |

---

## Vercel deploy

Build command: `prisma generate && pnpm build`
Migrations: `pnpm db:migrate` (manual, before deploy)
Seed: `pnpm db:seed` (once, after first migration)

Cron jobs (vercel.json):
- `fetch-bars`: `45 21 * * 1-5` — 4:45pm ET daily
- `scan`: `*/30 14-21 * * 1-5` — every 30min, market hours

---

## Prisma models

User · Ticker · PriceBar · Subscription · Alert

Enums: `UserRole` (USER, ADMIN) · `AlertType` (CSP_OPPORTUNITY, CC_OPPORTUNITY, SUPPORT_BREAK, RESISTANCE_BREAK, VOLUME_SURGE, SMA_CROSS_UP, SMA_CROSS_DOWN)
