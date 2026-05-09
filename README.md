# hlf-platform

Turborepo monorepo for HLF Financial Strategies LLC. Three production Next.js apps sharing a UI component library, each with its own isolated Railway PostgreSQL database.

---

## Apps

| App | Package name | Port | Domain | Purpose |
|---|---|---|---|---|
| `apps/wheel-trade-tracker` | `wheel-strat-tracker` | 3000 | wheel.hlfinancialstrategies.com | Options wheel strategy tracker — CSP/CC trades, stock lots, portfolios, P&L |
| `apps/bookkeeping` | `hlf-bookkeeping` | 3001 | bookkeeping.hlfinancialstrategies.com | Finance & trading P&L bookkeeping, tax estimates |
| `apps/budget-tracker` | `hlf-budgettracker` | 3002 | budget.hlfinancialstrategies.com | Monthly budget tracker + FIRE dashboard |

## Shared packages

| Package | Name | Purpose |
|---|---|---|
| `packages/ui` | `@hlf/ui` | shadcn/ui component library shared by all apps |
| `packages/auth-db` | `@hlf/auth-db` | Shared Prisma auth client (separate auth DB) |
| `packages/eslint-config` | `@hlf/eslint-config` | ESLint configs (`/base`, `/next-js`, `/react-internal`) |
| `packages/typescript-config` | `@hlf/typescript-config` | Shared `tsconfig.json` bases |

---

## Stack

All apps: Next.js 16 (App Router) · React 19 · TypeScript 5 strict · Prisma 6 · NextAuth 4 (JWT, 8hr session) · Tailwind CSS v4 · shadcn/ui (New York, slate) · Recharts · SWR · React Hook Form · Sonner · pnpm

---

## Databases

Each app has its own isolated Railway PostgreSQL database. They do not share a DB — cross-app data flows through the wheel-trade-tracker internal API.

| App | Railway host |
|---|---|
| wheel-trade-tracker | `ballast.proxy.rlwy.net:44433` |
| bookkeeping | `turntable.proxy.rlwy.net:21201` |
| budget-tracker | `shuttle.proxy.rlwy.net:29165` |

**Database rules:**
- Never run `prisma db push` or `prisma migrate dev` — these drop tables not in the app's slim schema.
- Always use `prisma migrate deploy` to apply explicit SQL migrations only.

---

## Local development

```bash
# Install all dependencies from monorepo root
pnpm install

# Run all apps in parallel
pnpm dev

# Run a single app
pnpm dev --filter=wheel-strat-tracker

# Type-check all packages and apps
pnpm check-types

# Build all apps
pnpm build

# Build a single app
pnpm build --filter=hlf-bookkeeping
```

Each app has its own `.env` file at `apps/<app>/.env`. Copy the `.env.example` in each app directory and fill in values. Required vars for all apps:

```
DATABASE_URL=          # app's own Railway connection string
NEXTAUTH_SECRET=       # must be identical across all three apps
NEXTAUTH_URL=          # app's local URL, e.g. http://localhost:3000
```

Additional vars per app — see each app's `.env.example`.

---

## Git workflow

**Branches are always cut at the monorepo root** — git operates on the whole repo, not individual app folders.

```bash
# Start work on any app or package
git checkout -b feature/my-change

# Work, commit normally
git add .
git commit -m "description"

# Push and open a PR against main
git push -u origin feature/my-change
```

A single PR can touch one app, multiple apps, or shared packages — whatever the change requires. Vercel deploys each affected app independently when merged to `main`.

To run only the app you're working on during development:

```bash
pnpm dev --filter=wheel-strat-tracker
pnpm dev --filter=hlf-bookkeeping
pnpm dev --filter=hlf-budgettracker
```

---

## Vercel deployment

Each app is a separate Vercel project pointing at this repo with its Root Directory set to the app's folder:

| Vercel project | Root Directory |
|---|---|
| wheel-trade-tracker | `apps/wheel-trade-tracker` |
| hlf-bookkeeping | `apps/bookkeeping` |
| hlf-budgettracker | `apps/budget-tracker` |

Vercel auto-detects Turborepo and scopes builds to the changed app. Set environment variables per project in the Vercel dashboard — they are not shared between projects.

Migrations are applied manually before or after deploy:

```bash
pnpm --filter=wheel-strat-tracker prisma:migrate
pnpm --filter=hlf-bookkeeping prisma:migrate
pnpm --filter=hlf-budgettracker prisma:migrate
```

---

## Cross-app integration

`wheel-trade-tracker` exposes a bearer-token-guarded internal API at `/api/internal/v1/`. Other apps call it over HTTP — no shared DB queries.

| Endpoint | Consumer |
|---|---|
| `GET /open-positions?email=` | hlf-wheel-alerts |
| `GET /closed-trades?userId=&from=&to=&portfolioIds=` | bookkeeping |
| `GET /portfolios?userId=` | bookkeeping |
| `GET /watchlist?email=` | hlf-wheel-alerts |

Shared secret: `INTERNAL_API_KEY` — must match in wheel-trade-tracker and any consumer.
