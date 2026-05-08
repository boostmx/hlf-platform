# HLF Bookkeeping

Personal bookkeeping and financial tracking app by HL Financial Strategies. Standalone application sharing the same PostgreSQL database as the [Wheel Trade Tracker](https://github.com/boostmx/wheel-strat-tracker).

## Features

- **Bookkeeping Dashboard** — MTD / YTD / All-time KPI strip (Net Income, Total Income, Total Expenses, Trading P&L)
- **Monthly Chart** — Income vs Expenses bar chart for the current year
- **Category Breakdown** — Top income and expense categories with visual bars
- **Transactions** — Full CRUD for income/expense entries with search and filters
- **Trading P&L Integration** — Auto-pulls realized premiums from closed wheel-strategy trades
- **Shared Auth** — Uses same username/password credentials as the Wheel Trade Tracker
- **Dark Mode** — Matches the same theme system as the sibling app

## Tech Stack

Exact same stack as `wheel-strat-tracker`:
- **Next.js 16** (App Router) + React 19 + TypeScript 5
- **Prisma 6** + PostgreSQL (Railway)
- **NextAuth 4** — credentials-based JWT auth
- **Tailwind CSS v4** + shadcn/ui (New York, slate, dark mode)
- **Recharts** + SWR + Lucide icons

## Database

This app connects to the **same PostgreSQL database** as wheel-strat-tracker. It adds one new table (`BookkeepingEntry`) and reads from existing tables (`User`, `Portfolio`, `Trade`) for trading P&L integration.

> ⚠️ **Never run `prisma db push` or `prisma migrate dev`** — this can modify or drop existing tables used by wheel-strat-tracker. Always use `prisma migrate deploy` which only applies the additive migration files in `/prisma/migrations/`.

## Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment variables
cp .env.example .env
# Fill in DATABASE_URL and NEXTAUTH_SECRET
# Use the same DATABASE_URL and NEXTAUTH_SECRET as wheel-strat-tracker

# 3. Generate Prisma client
pnpm prisma:generate

# 4. Apply the new BookkeepingEntry table migration (additive-only)
pnpm prisma:migrate

# 5. Run dev server
pnpm dev
```

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Same PostgreSQL connection string as wheel-strat-tracker |
| `NEXTAUTH_SECRET` | Same secret as wheel-strat-tracker (shares JWT signing) |
| `NEXTAUTH_URL` | Only needed in dev (`http://localhost:3001`); auto-detected on Vercel |

## Deployment (Vercel)

1. Import this repo into Vercel
2. Set `DATABASE_URL` and `NEXTAUTH_SECRET` in Vercel environment variables (same values as wheel-strat-tracker)
3. Add `NEXTAUTH_URL` pointing to your production domain
4. After first deploy, run `pnpm prisma:migrate` via Vercel CLI or Railway shell to create the `BookkeepingEntry` table

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/    # NextAuth handler
│   │   ├── bookkeeping/           # GET list, POST create
│   │   ├── bookkeeping/[id]/      # PUT update, DELETE
│   │   └── trading-summary/       # Reads P&L from wheel-strat-tracker trades
│   ├── dashboard/                 # Main dashboard page
│   ├── transactions/              # All transactions with filters
│   └── login/
├── features/bookkeeping/
│   ├── components/
│   │   ├── BookkeepingDashboard   # KPI strip, charts, recent transactions
│   │   ├── TransactionsContent    # Full transactions list with CRUD
│   │   └── AddEntryModal          # Create/edit entry modal
│   └── hooks/useBookkeeping.ts    # SWR data hooks
├── server/auth/auth.ts            # NextAuth config (same as wheel-strat-tracker)
└── types/index.ts                 # BookkeepingEntry, categories
```
