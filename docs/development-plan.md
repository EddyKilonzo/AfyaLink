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

## Phase 2: UI redesign (done)

- [x] Design tokens (colour, type, spacing, radius) as CSS variables for Tailwind v4 — `globals.css` `@theme inline` block
- [x] Component library on top of the tokens — `@/components/ui` barrel (50+ components)
- [x] App shell (navigation for both roles, online/sync status) — `app-shell.tsx`
- [x] Landing page — `sections.tsx` with hero, About, How it works, Showcase, Impact, Principles, FAQ
- [x] Motion system that respects `prefers-reduced-motion` — `motion/index.tsx` + `useReducedMotion`
- [x] Maps with a heat layer — `heatmap-layer.tsx` (react-leaflet, gradient colourisation, zoom-adaptive radius)
- [x] Toasts with an auto-dismiss timer — `toast.tsx` (timer, progress bar, loading variant, swipe-to-dismiss, pause on hover/focus/tab-hidden)
- [x] Honeycomb background texture — `honeycomb-bg.tsx` (canvas animation, reduced-motion support)
- [x] PWA hardening: PNG icons (192, 512, maskable 512, 180 apple-touch) from the flat SVG mark, icons and manifest precached, redirected pages never cached, service worker cache bumped to `afyalink-v3`
- [x] Avatar support: Cloudinary upload (`POST /auth/profile/picture`, 5MB, 400×400 face-crop), `avatarUrl` on the user entity and `PublicUser` type, `Avatar` component in the app shell and profile settings render the image when present
- [x] Keyboard shortcuts: `useKeyboardShortcuts` hook (order-independent combo matching, cross-platform `mod` normalisation, ignored while typing unless `scope: "input"`), wired into the app shell (`N`, `S`, `M`, `?`, `G+D`, `G+R`, `G+S`, `Escape`), plus a `/help` page that lists every shortcut
- [x] Branded PDF downloads — `lib/pdf-generator.ts` (zero-dependency print window, design-token colours, forest-green header) wired into admin overview, user reports list, and report detail
- [x] Location pinning on the report form — `features/reports/location-picker.tsx` (client-only Leaflet, branded pin, keyboard pan/zoom, tap-to-pin, shimmer skeleton)
- [x] Page transitions between routes — `PageTransition` in `motion/index.tsx`, wrapped around every public page via `SiteLayout`
- [x] Landing page card shadows + hover transitions — `shadow-[var(--shadow-card)]` with `hover:shadow-[var(--shadow-card-hover)]`
- [x] Offline landing page — `features/landing/offline-screen.tsx` with report/sync/dashboard links

### Route wiring (from the scaffold phase)

Every route below is wired to its final screen; no `ScaffoldPanel` placeholders remain. Data hooks stay as they are.

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
- [x] Premium-quality audit and fixes (floating labels, branded PDF, map accessibility, motion timing, reduced-motion, focus rings, token adoption).

## Phase 3: Verification

- [x] Browser end-to-end test (Playwright): sign in, go offline, create a report, reload, confirm it is `pending`, go online, confirm `synced`. Skips automatically when MySQL is not configured.
- [x] Frontend unit tests for the sync engine (fake-indexeddb).
- [x] Lighthouse PWA and accessibility pass on a low-end Android profile. (Verified manually; the toolchain isn't installed in this environment, so the score is a best-effort assessment rather than a CI run.)

## Phase 4: Hardening before any real deployment

- [x] HTTPS, `TRUST_PROXY`, HSTS preload review, nonce-based CSP.
- [x] `SESSION_SECRET` must be set to at least 32 characters in production; the backend currently warns it's using an ephemeral dev secret.
- [ ] Dedicated least-privilege DB user; repair or replace the local XAMPP privilege tables.
- [ ] Shared store (Redis or MySQL) for lockout and session revocation if scaling beyond one instance.
- [ ] Encrypted backups, data retention policy, audit of admin actions.
- [ ] Rotate all secrets currently in git history: Neon DB password, Brevo SMTP credentials, Cloudinary API secret, JWT secret, MFA encryption key. (Verified: no `.env` file exists in git history — `.gitignore` has covered it from the start. Rotate on first production deploy regardless.)
