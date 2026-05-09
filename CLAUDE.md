# hlf-platform — Monorepo

HLF suite monorepo. Consolidates all HLF apps and shared infrastructure packages.

---

## Structure

```
apps/
  wheel-strat-tracker/   Options wheel strategy tracker (hub — data source for suite)
  hlf-bookkeeping/       Finance & trading P&L bookkeeping
  hlf-budgettracker/     Monthly budget tracker + FIRE dashboard
  hlf-wheel-alerts/      Stock ticker alert system (standalone DB)
  hlf-website/           Marketing site (static)
  hungvnguyen-site/      Personal portfolio (static)

packages/
  auth-db/               Shared User Prisma schema + PrismaClient for auth DB
  ui/                    Shared shadcn/ui components (New York, slate)
  typescript-config/     Shared tsconfig presets (base, nextjs, react-library)
  eslint-config/         Shared ESLint config
```

---

## Apps at a Glance

| App | Port | Brand | DB |
|---|---|---|---|
| `wheel-strat-tracker` | 3000 | Emerald | `ballast` Railway |
| `hlf-bookkeeping` | 3001 | Indigo | `turntable:21201` Railway |
| `hlf-budgettracker` | 3002 | Teal | `shuttle` Railway |
| `hlf-wheel-alerts` | 3003 | Violet | `turntable:51073` Railway |

---

## Shared Packages

### `@hlf/auth-db`
Prisma client for the shared auth DB (`AUTH_DATABASE_URL`). Owns the `User` table —
the single source of truth for user identity across the HLF suite. All apps read
and write user records through this package; per-app DBs only store opaque
`userId` strings (no FK constraint).

```ts
import { authPrisma, sharedCookieConfig } from "@hlf/auth-db"
import type { User } from "@hlf/auth-db"
```

`sharedCookieConfig()` — drop into NextAuth `cookies` to enable cross-subdomain
SSO. Returns a config that scopes the session cookie to `.hlfinancialstrategies.com`
in production; returns `undefined` in dev so localhost cookies stay host-only.

Migration: `pnpm --filter @hlf/auth-db db:migrate`

### `@hlf/ui`
Shared shadcn/ui components. New York theme, slate base, Tailwind CSS v4.
Apps import from here instead of duplicating components.

### `@hlf/typescript-config`
- `base.json` — strict TypeScript for library packages
- `nextjs.json` — Next.js apps (ESNext + Bundler resolution)
- `react-library.json` — React component libraries

---

## Cross-app Integration

wheel-strat-tracker exposes `/api/internal/v1/` (bearer: `INTERNAL_API_KEY`):

| Endpoint | Consumer |
|---|---|
| `GET /open-positions?email=` | hlf-wheel-alerts |
| `GET /closed-trades?userId=&from=&to=&portfolioIds=` | hlf-bookkeeping |
| `GET /portfolios?userId=` | hlf-bookkeeping |
| `GET /watchlist?email=` | hlf-wheel-alerts (future) |

---

## Environment Variables

| Variable | Scope | Notes |
|---|---|---|
| `AUTH_DATABASE_URL` | All HLF apps | Shared auth DB — `@hlf/auth-db`. Required by every app. |
| `DATABASE_URL` | Per-app | Each app's own Railway DB |
| `NEXTAUTH_SECRET` | All HLF apps | **Must be identical** for cross-app JWT validity |
| `NEXTAUTH_URL` | All HLF apps | Drives `sharedCookieConfig()` — must start with `https://` in prod for SSO cookie to be issued |
| `INTERNAL_API_KEY` | wheel-tracker + consumers | Bearer token for internal API |
| `WHEEL_TRACKER_URL` | bookkeeping, wheel-alerts | Base URL for internal API calls |

---

## Commands

```bash
pnpm build              # build all apps + packages
pnpm dev                # dev all apps in parallel
turbo run build --filter=wheel-strat-tracker   # build one app
pnpm --filter @hlf/auth-db db:migrate          # run auth DB migrations
pnpm --filter @hlf/auth-db db:generate         # regenerate auth Prisma client
```

---

## Migration Status

Apps moved into the monorepo:

- [x] `wheel-strat-tracker` — in monorepo, on shared auth DB (v2.15.0)
- [x] `hlf-bookkeeping` — in monorepo, on shared auth DB (v1.3.0)
- [x] `hlf-budgettracker` — in monorepo, on shared auth DB (v1.1.0)
- [ ] `hlf-wheel-alerts` — not yet moved
- [ ] `hlf-website` — not yet moved
- [ ] `hungvnguyen-site` — not yet moved
- [x] `packages/auth-db` — auth DB live (`nozomi.proxy.rlwy.net:14507`); all 3 HLF apps consume it
- [x] Local `User` tables dropped from all 3 app DBs (2026-05-09)
- [x] `packages/typescript-config` — done
- [x] `packages/eslint-config` — done
- [ ] `packages/ui` — shell only, components to be moved from apps
