# Alerts module — setup runbook

The realtime alerts module inside `apps/wheel-trade-tracker` replaces the
retired stock-alerts app. **Delivery is in-app toast only** — Web Push was
dropped on 2026-05-13 in favor of sonner toasts + a tab-title flash when the
window isn't focused. The engine and scan endpoint are unchanged; only the
last-mile delivery differs.

## One-time setup

### 1. Set wheel-tracker env vars (Vercel + local `.env`)

| Variable | Value |
|---|---|
| `ALPACA_API_KEY` | from Alpaca dashboard |
| `ALPACA_SECRET_KEY` | from Alpaca dashboard |
| `ALERTS_SCAN_SECRET` | any long random string — `openssl rand -hex 32` |

That's it. No VAPID keys, no service worker, no push opt-in.

### 2. Apply the schema migration

Against the wheel-tracker Railway DB:

```bash
pnpm --filter wheel-strat-tracker prisma migrate deploy
```

Adds `UserAlertPreferences`, `PushSubscription`, `AlertConfig`, `AlertEvent`
plus `AlertConfigType` enum. (`PushSubscription` is dormant — never written.
Left for forward compat if push gets added back.) Non-destructive: only
`CREATE TABLE` statements.

### 3. Set GitHub Actions secrets

Repo settings → Secrets and variables → Actions:

| Secret | Value |
|---|---|
| `ALERTS_SCAN_URL` | `https://wheel.hlfinancialstrategies.com/api/alerts/scan` |
| `ALERTS_SCAN_SECRET` | same value as the wheel-tracker env var |

The workflow at [.github/workflows/alerts-scan.yml](../.github/workflows/alerts-scan.yml)
fires `*/2 14-21 * * 1-5` UTC (US market hours).

## Smoke testing in dev

```bash
pnpm --filter wheel-strat-tracker dev
```

1. Open any open trade → scroll to the **Alerts** card → **Add alert** → pick a type + threshold → save.
2. Open `/watchlist` → click the bell icon on any row → set a price trigger.
3. Hit the scan endpoint to evaluate immediately:
   ```bash
   curl -X POST http://localhost:3000/api/alerts/scan \
     -H "Authorization: Bearer $ALERTS_SCAN_SECRET"
   ```
   You'll get `{ configsEvaluated, fired, skippedDedup, skippedDisabled, errors[], elapsedMs }`.
4. If `fired > 0`, an in-app toast appears within ~15 s (the [AlertToastsListener](../apps/wheel-trade-tracker/src/features/alerts/components/AlertToastsListener.tsx) poll interval). Switch to another tab and re-trigger — you'll see the tab title prefix with `(N)` to flag unseen alerts.
5. Manage existing triggers on `/alerts` — enable/disable, delete, see full history.

## How delivery works (toast model)

1. **Engine writes `AlertEvent` rows** when thresholds fire.
2. **`AlertToastsListener`** is mounted in `AppShell` for any authed page. It polls `GET /api/alerts/events?since=<lastSeenISO>` every 15 s.
3. For each new event in the response, it calls `toast(...)` from sonner with the alert message and a contextual action (View trade / Watchlist).
4. If `document.visibilityState !== "visible"`, it also increments a counter in the tab title (`(3) HLF Wheel Trade Tracker`). Refocus or visibility change resets the counter.
5. Sonner's `Toaster` is mounted globally in [app-providers.tsx](../apps/wheel-trade-tracker/src/components/app-providers.tsx).

The 15 s poll interval + 2 min GitHub Actions cron + 30 min engine dedup means the worst-case latency from market move to in-app toast is roughly **2 min 15 s** — acceptable for wheel timeframes.

## Deprecation of old stock-alerts assets

After the new module is verified in prod:

- [ ] Delete the `hlf-stock-alerts` Vercel project (or rename + disable deploys)
- [ ] Remove the `alerts.hlfinancialstrategies.com` CNAME (or redirect to `wheel.../alerts`)
- [ ] Delete the standalone stock-alerts Railway PostgreSQL service
- [ ] Delete `./hlf-wheel-alerts` (legacy standalone dir at workspace root)
- [ ] Drop portal env vars: `STOCK_ALERTS_URL`, `NEXT_PUBLIC_STOCK_ALERTS_URL`. Point the portal app launcher card at `wheel.hlfinancialstrategies.com/alerts`.

## Rollback

The alerts module is self-contained. If it misbehaves:

1. Disable the GitHub Actions workflow: repo Actions tab → Alerts scan → ⋯ → Disable workflow. Stops the trigger.
2. Or revoke `ALERTS_SCAN_SECRET` on the server — endpoint will 401 every request.

Schema tables remain harmless until intentionally dropped.

## Adding push back later (if ever)

The schema still has the `PushSubscription` table and `AlertEvent.pushDelivered` flag. To re-add Web Push:

1. Reinstate the `web-push` dep and the `src/lib/alerts/push.ts` helper.
2. Re-add `public/sw.js` + `src/lib/alerts/push-client.ts`.
3. Re-add `/api/push/subscribe` and `/api/push/test` routes.
4. In `engine.ts`, restore the `sendPushToUser` call in the persist loop.
5. Re-introduce the VAPID env vars.
6. Add a per-user push-enable toggle on `/alerts`.

The git history of this branch can be referenced for the working push code.
