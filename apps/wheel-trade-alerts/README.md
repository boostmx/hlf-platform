# HLF Wheel Alerts

Stock ticker alert system for wheel strategy traders. Monitors RSI, support/resistance, SMA, and volume signals on a curated universe of wheel-eligible tickers. Dispatches rich alerts via email and Discord, and tracks open positions for exit monitoring.

---

## What it does

- **Daily bar ingestion** — pulls OHLCV from Alpaca Markets after market close, stores up to 220 days per ticker
- **Signal scanning** — evaluates RSI(14), SMA 50/200 crosses, swing support/resistance proximity, and volume surges against per-user thresholds
- **Rich entry alerts** — messages include RSI value, exact support/resistance level + proximity %, and a suggested strike zone rounded to the nearest $5
- **Position-aware exit alerts** — open CSPs and CCs are monitored every scan for profit target (~25–50% decay proxy), assignment risk (price within 2% of strike, ≤21 DTE), and roll opportunities (≤7 DTE, still OTM)
- **Dual dispatch** — Resend email + Discord webhook embeds with signal data fields
- **Alert deduplication** — one alert per (user × ticker × type) per 24 hours

---

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript 5 strict |
| Database | PostgreSQL (Railway) via Prisma 7 + `@prisma/adapter-pg` |
| Auth | NextAuth 4 (credentials, JWT, 8hr session) |
| Styling | Tailwind CSS v4, shadcn/ui (New York, slate), Plus Jakarta Sans |
| Market data | Alpaca Markets API (`@alpacahq/typescript-sdk`) |
| Alert messages | Anthropic Claude Haiku (falls back to template if key absent) |
| Email | Resend |
| Cron | Vercel Cron (serverless, defined in `vercel.json`) |

**Primary color:** Violet `oklch(0.52 0.24 290)` · Dark/light mode toggle (next-themes, defaults to system)

---

## Architecture

```
Vercel Cron (4:45pm ET)
  └─ /api/cron/fetch-bars    Pull daily OHLCV from Alpaca → PriceBar

Vercel Cron (every 30min, market hours)
  └─ /api/cron/scan
       ├─ Market signals      RSI, SMA, support/resistance, volume
       │    └─ Entry alerts   CSP_OPPORTUNITY, CC_OPPORTUNITY, SUPPORT_BREAK,
       │                      RESISTANCE_BREAK, VOLUME_SURGE, SMA_CROSS_UP/DOWN
       └─ Position signals    Evaluate open UserPositions vs current price/DTE
            └─ Exit alerts    PROFIT_TARGET, ASSIGNMENT_RISK, ROLL_OPPORTUNITY
```

### Signal logic (`src/lib/signals.ts`)

| Signal | Condition |
|---|---|
| `CSP_OPPORTUNITY` | RSI ≤ 35 (default) + price within 3% of swing support |
| `CC_OPPORTUNITY` | RSI ≥ 65 + price within 3% of swing resistance |
| `SUPPORT_BREAK` | Price drops >1% below nearest swing low |
| `RESISTANCE_BREAK` | Price rises >1% above nearest swing high |
| `VOLUME_SURGE` | Today's volume > 2× 20-day average |
| `SMA_CROSS_UP/DOWN` | Price crosses 50 SMA vs previous day |

All thresholds are configurable per user via Settings.

### Position exit logic (`src/lib/position-signals.ts`)

| Alert | Condition |
|---|---|
| `PROFIT_TARGET` | ≥4% OTM + ≥35% of option life elapsed (~25–50% premium decay proxy) |
| `ASSIGNMENT_RISK` | Price within 2% of strike (or ITM) with ≤21 DTE |
| `ROLL_OPPORTUNITY` | ≤7 DTE and still ≥2% OTM |

---

## Key files

```
src/
├── app/
│   ├── (auth)/sign-in|sign-up/       Auth pages
│   └── (app)/
│       ├── dashboard/                Recent alerts + subscribed tickers
│       ├── positions/                Open CSP/CC/stock positions + exit monitoring
│       ├── tickers/                  Browse + subscribe to approved tickers
│       ├── alerts/                   Full alert history with signal pills
│       ├── settings/                 Notification prefs + alert thresholds
│       └── admin/                    Ticker management (ADMIN only)
│   └── api/
│       ├── cron/fetch-bars/          Daily bar ingestion from Alpaca
│       ├── cron/scan/                Signal scan + position scan + alert dispatch
│       ├── positions/                CRUD for user positions
│       ├── subscriptions/            POST/DELETE ticker subscriptions
│       ├── settings/                 PATCH user settings + Discord test
│       └── admin/tickers/            Admin ticker CRUD
├── lib/
│   ├── alpaca.ts                     Alpaca client (baseURL + feed: "iex" required)
│   ├── signals.ts                    RSI, SMA, swing high/low, trigger evaluation
│   ├── position-signals.ts           Open position exit signal evaluation
│   ├── notify.ts                     Email (Resend) + Discord webhook dispatch
│   ├── auth.ts                       NextAuth config
│   └── prisma.ts                     Prisma client singleton
prisma/
├── schema.prisma
├── seed.ts                           30-ticker wheel universe + admin user
└── migrations/
    ├── 20260506000000_init/
    └── 20260506000001_add_positions/
vercel.json                           Cron schedules
```

---

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Railway PostgreSQL (`turntable.proxy.rlwy.net:51073`) |
| `NEXTAUTH_SECRET` | JWT signing |
| `NEXTAUTH_URL` | App domain |
| `ALPACA_API_KEY` | Alpaca Markets API key |
| `ALPACA_SECRET_KEY` | Alpaca Markets secret |
| `ALPACA_BASE_URL` | `https://paper-api.alpaca.markets` |
| `ALPACA_DATA_URL` | `https://data.alpaca.markets` |
| `ANTHROPIC_API_KEY` | Claude Haiku for alert messages (optional — falls back to template) |
| `RESEND_API_KEY` | Email delivery |
| `RESEND_FROM_EMAIL` | Sender address |
| `CRON_SECRET` | Bearer token for Vercel Cron authorization |

---

## Local development

```bash
pnpm install
pnpm db:migrate       # apply migrations
pnpm db:generate      # generate Prisma client
pnpm db:seed          # seed 30 tickers + admin user
pnpm dev
```

### Manually trigger crons

```bash
# Pull price history (run once on fresh DB)
curl -s http://localhost:3000/api/cron/fetch-bars \
  -H "Authorization: Bearer $CRON_SECRET"

# Evaluate signals + fire alerts
curl -s http://localhost:3000/api/cron/scan \
  -H "Authorization: Bearer $CRON_SECRET"

# Clear alerts for retesting
psql "$DATABASE_URL" -c 'DELETE FROM "Alert";'
```

---

## Vercel deploy

```
Build command:   prisma generate && pnpm build
Migrations:      pnpm db:migrate  (run manually before deploy)
Seed:            pnpm db:seed     (once, after first migration)
```

Cron jobs activate automatically from `vercel.json` on deploy.

---

## Admin

No UI for role promotion yet. Promote via SQL:

```bash
psql "$DATABASE_URL" -c "UPDATE \"User\" SET role = 'ADMIN' WHERE email = 'you@example.com';"
```

The seed script creates `admin@hlfinancialstrategies.com` (password: `changeme123`) as ADMIN on first run.

---

## Known SDK quirks

**`@alpacahq/typescript-sdk@0.0.32-preview`** — two bugs worked around in `src/lib/alpaca.ts`:

1. `paper` option is ignored due to a destructuring bug — always set `baseURL: "https://data.alpaca.markets"` explicitly
2. Free tier only has IEX feed access — always pass `feed: "iex"` on bar requests
