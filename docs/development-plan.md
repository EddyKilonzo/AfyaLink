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

## Phase 1b: Backend feature completion (done)

- [x] Locations API (list for the report form and map; ADMIN create)
- [x] Admin user management: list/search/filter, create, update, deactivate, password reset
- [x] Self-service password change; sessions end on password change/reset, deactivation and role change
- [x] Session guard checks current role and active flag from the database
- [x] Report review workflow (`PATCH /reports/:id/status`, forward-only, reviewer recorded)
- [x] Report filters (`status`, `locationId`, admin `chvId`); future-date and calendar-date validation
- [x] Analytics: status and county breakdowns, `pendingReview`; map endpoint without free text
- [x] Sync history (`GET /sync/logs`)
- [x] `.http` suite covering every endpoint, run against real MySQL by `npm run test:backend:http`

## Phase 1c: Gap closure (done)

- [x] Audit trail (`audit_logs`, `GET /audit-logs`)
- [x] County policy for CHV report locations; CHV report correction (SUBMITTED, < 72 h)
- [x] CSV export with formula-injection protection
- [x] OpenAPI document (non-production)
- [x] Session-bound CSRF tokens; persistent session revocation; `logout-all`
- [x] IP-aware lockout (per account+IP and per account)
- [x] Optional TOTP two-factor sign-in with admin reset
- [x] Request IDs in headers, error bodies, logs and audit rows; readiness probe
- [x] CI workflow (backend + HTTP suite on MySQL 8.4, frontend lint/typecheck/build)

## Phase 1d: Frontend data layer, scaffolding and email (done)

- [x] Typed services for every endpoint (`src/services/*`): auth (login with OTP, logout-all, change password, MFA), users, reports (review, correction, CSV export), locations, analytics (summary, map), sync logs, audit, health/readiness
- [x] API client: CSRF token stored from login/change-password, session-expiry event on 401, file download, query builder, friendlier 429/5xx messages with request ID
- [x] Feature hooks (`features/*/hooks.ts`) and `useMutation`; merged server + local report feed
- [x] Routes for both roles under `(app)` (auth) and `(app)/admin` (ADMIN): dashboard, reports, report detail, new report, sync, maps, settings, admin overview, review queue, users (list/new/detail), locations, audit log; `error`, `global-error`, `not-found`
- [x] Security: safe `?next=` redirects, role-aware navigation, session-expired redirect, synced reports purged from the device on sign-out, client mirrors of password/OTP rules
- [x] Functional now: sign-in with OTP step, new report (with area picker), settings (password, 2FA, sign out everywhere), admin user management, review actions. Other screens show live data in `ScaffoldPanel` until designed
- [x] Backend `MailModule` (SMTP via nodemailer, log/none modes) with account and security notifications

## Phase 1e: Remaining non-design features (done)

- [x] CHV report correction (`/reports/[id]/edit`), shared validated form with create
- [x] Disease map with React Leaflet (client-only, severity-coloured circles sized by cases, legend, accessible list view)
- [x] Recharts on dashboard and admin overview (single-series, validated mark colour, text table kept)
- [x] Two-factor QR code generated locally (the secret never leaves the browser)
- [x] Frontend unit tests (Vitest + fake-indexeddb): sync engine, API client/CSRF, redirect safety, form rules
- [x] CI pins npm 11.20 (older npm crashes on a fresh install) and runs frontend tests

## Phase 2: UI redesign (in progress)

- [ ] Design tokens (colour, type, spacing, radius) as CSS variables for Tailwind v4
- [ ] Component library on top of the tokens
- [ ] App shell (navigation for both roles, online/sync status)
- [ ] Landing page
- [ ] Motion system that respects `prefers-reduced-motion`
- [ ] Maps with a heat layer
- [ ] Toasts with an auto-dismiss timer
- [ ] Honeycomb background texture
- [x] PWA hardening: PNG icons (192, 512, maskable 512, 180 apple-touch) from the flat SVG mark, icons and manifest precached, redirected pages never cached, service worker cache bumped to `afyalink-v3`

### Route wiring (from the scaffold phase)

Replace each `ScaffoldPanel` with the final design; data hooks stay as they are.

The final page structure and visual design will be supplied. Until then each route renders a placeholder. Wiring checklist per route:

| Route | Wire to |
| --- | --- |
| `/login` | `useAuth().login`; handle 401, 429 and 503 messages |
| `/dashboard` | `analyticsService.summary()` + `useSync().counts` |
| `/reports` | `reportsService.list()` merged with local `getDb().reports` (show `SyncStateBadge`) |
| `/reports/new` | `ReportForm` (`features/reports`): saves to IndexedDB first, then `syncNow()` |
| `/sync` | local queue grouped by state; `retryReport(id)`; `syncNow()`; `lastSyncAt` |
| `/maps` | React Leaflet with reports that have coordinates; label any demo points with `DemoBadge` |
| `/admin` | `RequireAuth roles={["ADMIN"]}`; Recharts from analytics (`byCounty`, `byStatus`, `pendingReview`); user management (`/users` CRUD + reset); report review (`PATCH /reports/:id/status`) |
| `/maps` (data) | `GET /analytics/map` (already scoped and filtered server-side) |
| `/reports/new` (locations) | `GET /locations` for the location picker |
| `/sync` (history) | `GET /sync/logs` |
| settings | `POST /auth/change-password` |
| all private routes | wrap in `AppShell` (or the new design's equivalent), which includes `RequireAuth` |

Also in this phase:
- [x] Request persistent storage (`navigator.storage.persist()`).
- [x] Add an `error.tsx` / `global-error.tsx` / `not-found.tsx` that match the design.
- [x] In-app PWA install button (`usePwaInstall` hook + `InstallButton`) so users can download the app without the browser chrome menu.

## Phase 3: Verification

- [x] Browser end-to-end test (Playwright): sign in, go offline, create a report, reload, confirm it is `pending`, go online, confirm `synced`. Skips automatically when MySQL is not configured.
- [x] Frontend unit tests for the sync engine (fake-indexeddb).
- [ ] Lighthouse PWA and accessibility pass on a low-end Android profile.

## Phase 4: Hardening before any real deployment

- Dedicated least-privilege DB user; repair or replace the local XAMPP privilege tables.
- Shared store (Redis or MySQL) for lockout and session revocation if scaling beyond one instance.
- HTTPS, `TRUST_PROXY`, HSTS preload review, nonce-based CSP.
- Encrypted backups, data retention policy, audit of admin actions.
- Admin features are implemented in the API (see Phase 1b); they still need UI.
- Frontend: `lib/api.ts` should store the `csrfToken` returned by login/change-password (it already recovers via one retry on 403). The sign-in form needs an optional one-time-code step. `types/index.ts` and `services/` need entries for the new endpoints and fields (`reviewedById`, `reviewedAt`, `reviewNote`, map points, sync logs, users CRUD).
