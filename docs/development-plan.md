# Development plan

## Phase 1: Scaffold (done)

- [x] Repository layout: `frontend/` (Next.js 16), `backend/` (NestJS 12), root `concurrently` scripts
- [x] MySQL schema with enums, foreign keys, indexes and checks; synthetic seed; migration runner
- [x] Auth: HTTP-only session cookie, CSRF, bcrypt, roles, lockout, rate limits, logout revocation
- [x] Reports API with idempotent create; batch sync API with per-item results and audit log
- [x] Analytics summary (aggregates only)
- [x] Consistent error handling: try/catch in every controller and service, error mapper, global filter
- [x] API runs without a database (503s, background reconnect)
- [x] Frontend data layer: typed API client and services, Dexie schema, sync engine with backoff and recovery, auth and sync providers
- [x] PWA foundation: manifest, conservative service worker, security headers and CSP
- [x] Backend tests: unit and e2e

## Phase 2: UI (waiting on design)

The final page structure and visual design will be supplied. Until then each route renders a placeholder. Wiring checklist per route:

| Route | Wire to |
| --- | --- |
| `/login` | `useAuth().login`; handle 401, 429 and 503 messages |
| `/dashboard` | `analyticsService.summary()` + `useSync().counts` |
| `/reports` | `reportsService.list()` merged with local `getDb().reports` (show `SyncStateBadge`) |
| `/reports/new` | `ReportForm` (`features/reports`): saves to IndexedDB first, then `syncNow()` |
| `/sync` | local queue grouped by state; `retryReport(id)`; `syncNow()`; `lastSyncAt` |
| `/maps` | React Leaflet with reports that have coordinates; label any demo points with `DemoBadge` |
| `/admin` | `RequireAuth roles={["ADMIN"]}`; Recharts from analytics; `usersService.list()` |
| all private routes | wrap in `AppShell` (or the new design's equivalent), which includes `RequireAuth` |

Also in this phase:
- Request persistent storage (`navigator.storage.persist()`).
- Add an `error.tsx` / `global-error.tsx` / `not-found.tsx` that match the design.

## Phase 3: Verification

- [ ] Browser end-to-end test (e.g. Playwright): sign in, go offline, create a report, reload, confirm it is `pending`, go online, confirm `synced` and exactly one DB row.
- [ ] Frontend unit tests for the sync engine (fake-indexeddb).
- [ ] Lighthouse PWA and accessibility pass on a low-end Android profile.

## Phase 4: Hardening before any real deployment

- Dedicated least-privilege DB user; repair or replace the local XAMPP privilege tables.
- Shared store (Redis or MySQL) for lockout and session revocation if scaling beyond one instance.
- HTTPS, `TRUST_PROXY`, HSTS preload review, nonce-based CSP.
- Encrypted backups, data retention policy, audit of admin actions.
- Admin features: review and action reports (`status` transitions), user management, password reset.
