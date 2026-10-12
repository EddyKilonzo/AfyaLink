# AfyaLink

**Design and Development of AfyaLink: An Offline-First Community Health Reporting System for Rural Kenya.**

*From Community Reports to Faster Health Action.*

AfyaLink lets Community Health Volunteers (CHVs) record community health reports on a phone, keep them while offline, and synchronize them to a central MySQL database when connectivity returns. Administrators get reporting dashboards and disease maps.

> Academic prototype. Not integrated with any national health system and not production-ready. All bundled data is synthetic.

## Repository layout

```text
afyalink/
├── frontend/              Next.js 16 (App Router, React 19, TypeScript, Tailwind v4)
│   ├── public/            sw.js (service worker), SVG + PNG icons
│   ├── scripts/           generate-icons.mjs (PNG icons from the SVG mark)
│   └── src/
│       ├── app/           routes: /, /login, /dashboard, /reports, /reports/new, /sync, /maps, /admin
│       ├── components/    shared UI pieces
│       ├── features/      auth context, offline sync engine + provider, report form/schema
│       ├── hooks/         useOnlineStatus, useAsync
│       ├── lib/           API client (CSRF, typed errors), Dexie/IndexedDB schema, config
│       ├── services/      typed API services (reports, analytics, users, health)
│       └── types/         shared domain types and enums
├── backend/               NestJS 12 (TypeScript, ESM), REST API under /api
│   ├── database/
│   │   ├── migrations/    SQL schema (tables, enums, FKs, indexes, checks)
│   │   └── seeds/         synthetic development data
│   ├── scripts/           db.mjs (migration/seed runner), http-test.mjs (HTTP suite runner)
│   ├── src/               auth (sessions, CSRF, MFA), users, locations, reports, analytics, sync, audit, database, common, health
│   └── test/              e2e tests (Vitest + supertest) and http/ (.http request suite)
├── .github/workflows/     CI: backend checks + HTTP suite on MySQL 8.4, frontend lint/typecheck/build
├── docs/                  architecture, database schema, API, development plan
├── package.json           root scripts (concurrently)
├── .env.example
└── .gitignore
```

## Requirements

- Node.js **22.12+** (24 LTS recommended; the Nest CLI tooling warns below 22.22)
- npm **11.20+** (`npm install -g npm@11.20.0`). Older npm, including the npm 10 bundled with Node 22, crashes during a fresh install with `Cannot read properties of null (reading 'edgesOut')` while resolving Vitest's peer dependencies. npm 11.20+ also skips unapproved install scripts; nothing in this project needs them to build or test.
- MySQL 8.0+ or MariaDB 10.5+ (tested locally with XAMPP MariaDB 10.4.32). Optional for starting the apps.

## Quick start

```bash
# create .env in the repo root with the variables listed under Environment variables
npm install                 # installs root, frontend/ and backend/ dependencies
npm run db:migrate          # creates the database (if permitted) and applies the schema
npm run db:seed             # loads synthetic demo data (refuses when NODE_ENV=production)
npm run dev                 # starts both apps; Ctrl+C stops both
```

| What | URL |
| --- | --- |
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001/api |
| Health check | http://localhost:3001/api/health |

### Running without a database

Both apps start without MySQL. `GET /api/health` returns `"database": "not_configured"` (or `"unavailable"` while it retries every 15 s), and every data endpoint (login, reports, analytics, sync) returns **503** with a clear message instead of crashing. The offline queue in the browser keeps reports until the server is reachable.

## Root scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Frontend (3000) + backend (3001, watch mode) via `concurrently -k` |
| `npm run build` | Production build of both apps |
| `npm start` | Run both production builds |
| `npm run lint` | ESLint (frontend) + oxlint (backend) |
| `npm run typecheck` | `tsc --noEmit` in both apps |
| `npm test` | Frontend unit tests, then backend unit + e2e tests (Vitest, no database needed) |
| `npm run test:backend:http` | Builds the backend and runs the `.http` suite against real MySQL (see below) |
| `npm run db:migrate` / `db:seed` / `db:status` | SQL migration runner in `backend/scripts/db.mjs` |

## Environment variables

Create a `.env` file in the repository root (it is gitignored). Variables:

| Variable | Used by | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | frontend | Public. Default `http://localhost:3001/api`. |
| `PORT` | backend | Default `3001`. |
| `CORS_ORIGINS` / `FRONTEND_ORIGIN` | backend | Comma-separated allowed origins; must be `https://` in production. |
| `DATABASE_URL` or `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | backend | MySQL connection. |
| `SESSION_SECRET` / `JWT_SECRET` | backend | ≥ 32 chars; required in production. |
| `COOKIE_SECURE` | backend | Defaults to `true` in production; startup fails if forced off there. |
| `TRUST_PROXY` | backend | Proxy hops to trust so rate limits see real client IPs. |
| `LOGIN_MAX_FAILURES`, `LOGIN_ACCOUNT_MAX_FAILURES`, `LOGIN_LOCKOUT_MINUTES` | backend | Lockout: per account + client IP (default 5), per account from any IP (default 25), window (default 15 min). |
| `MFA_ENCRYPTION_KEY` | backend | 32-byte key (64 hex chars or base64) that encrypts two-factor secrets. **Required in production.** In development it is derived from the session secret. |
| `RATE_LIMIT_DISABLED` | backend | `true` turns off rate limiting for local test runs. Startup fails if set in production. |
| `MAIL_TRANSPORT` | backend | `smtp`, `log` or `none`. Default: `smtp` when `SMTP_HOST` is set, otherwise `log` in development (logs subject + masked recipient, sends nothing) and `none` in production. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` | backend | SMTP server. Port defaults to 587 with STARTTLS **required**; `SMTP_SECURE=true` (or port 465) uses implicit TLS. Set both user and password, or neither. |
| `MAIL_FROM` | backend | Sender, e.g. `AfyaLink <no-reply@example.org>`. |
| `APP_URL` | backend | Frontend URL used for links in emails (never taken from the request). Defaults to the first CORS origin; must be `https://` in production. |
| `HTTP_TEST_DB_NAME`, `HTTP_TEST_PORT` | HTTP test runner | Default `<DB_NAME>_http_test` and `3101`. The name must end in `_test`. |

The backend reads `backend/.env`, then the root `.env`. The frontend copies **only** `NEXT_PUBLIC_*` keys from the root `.env`, so server secrets never enter the browser bundle or the Next.js process.

## Progressive web app

The service worker (`frontend/public/sw.js`) registers only in production builds (`npm run build && npm start`). In development it is unregistered so hot reload never serves stale files. Service workers need HTTPS, except on `localhost`.

**Install.** Chrome and Edge (Android or desktop) offer *Install app* in the browser menu or address bar. On iOS Safari, use *Share → Add to Home Screen*. The installed app opens at `/dashboard` and has shortcuts to *New report* and *Sync*.

**Icons.** `public/icon.svg` and `public/icon-maskable.svg` are the source mark. The PNGs in `public/icons/` (192, 512, maskable 512) and `src/app/apple-icon.png` (180, iOS) are generated from them by `node scripts/generate-icons.mjs` (run from `frontend/`). The script uses `sharp`, which Next.js installs as an optional dependency. Re-run it if the SVG changes, then commit the PNGs.

**What is cached.**

- On install: every static app route (`/`, `/login`, `/offline`, `/dashboard`, `/reports`, `/reports/new`, `/sync`, `/maps`, `/settings` and the `/admin/*` pages), the hashed `/_next/static/*` scripts and styles they reference, the manifest and the icons.
- Page navigations are network-first. Offline, the last cached copy is shown. A page never opened before (for example `/reports/123`) falls back to `/offline`.
- `/_next/static/*` is cache-first, because those files are content-hashed. Icons and the manifest are stale-while-revalidate.
- A new deploy that bumps the cache version activates straight away and deletes the old caches.

**What is never cached:** API responses (the API is on another origin, and any `/api/` path is skipped as well), other cross-origin requests, non-GET requests, responses marked `no-store` or `private`, and redirected pages. Next.js client-side (RSC) fetches are not intercepted. Reports live in IndexedDB (Dexie), not in the service worker cache.

**Map tiles** come from OpenStreetMap and are not cached, so the map needs a connection. The rest of the maps page still loads offline.

**Testing offline in Chrome DevTools.** Run a production build (`npm run build && npm start`), open http://localhost:3000 and visit a few pages. Then:

1. *Application → Service workers*: `sw.js` should be activated. *Application → Manifest* shows the icons and any installability warnings.
2. *Application → Cache storage* should list `afyalink-v3-shell` and `afyalink-v3-static`.
3. Tick *Offline* (under *Service workers*, or in the *Network* throttling menu) and reload. Cached pages should open, and an unvisited dynamic page should show `/offline`.
4. Create a report while offline. It stays `pending` in *Application → IndexedDB* until you go back online and it syncs.

PWA status: the manifest, icons, `/offline` and `sw.js` were checked with curl against a production build, and the service worker's asset matcher was checked against real built HTML. Installing the app and reloading offline have not been tested in a real browser, and no Lighthouse run has been done yet.

## Security summary

- HTTP-only, `SameSite=Lax` session cookie (signed JWT with `jti`); nothing secret in `localStorage`.
- Session-bound CSRF token (`GET /api/auth/csrf` → `X-CSRF-Token` header): an HMAC binds it to the current session, so a planted cookie cannot be paired with a victim's session. Sign-in, password change and logout issue a new token. Every state-changing request also checks the Origin against an allow-list.
- Optional TOTP two-factor sign-in for any account, aimed at admins. Secrets are encrypted at rest (AES-256-GCM, bound to the user ID), each code works once, and an admin can reset it for a lost device.
- bcrypt (cost 12) password hashing; constant-time-ish login (dummy hash for unknown emails); generic error messages.
- Rate limiting per IP (burst 30/10 s, 120/min; login 5/min, sync and CSRF 30/min). Lockout counts failures per account and client IP, so one guesser cannot lock the real user out, plus a higher per-account cap for distributed attacks.
- Server-side session revocation on logout, stored in MySQL (`revoked_sessions`), so it survives restarts and is shared between instances. `POST /api/auth/logout-all` signs a user out on every device. Every request also checks the user's current role and active flag in the database (cached for 10 s, cleared on change), so deactivation and role changes take effect on existing sessions. Password change/reset, deactivation and role change end all of a user's sessions (`users.tokens_valid_after`); reactivating an account does not revive them.
- Account and security emails (`backend/src/mail`): account created, password changed or reset, two-factor on/off/reset, signed out everywhere, deactivated/reactivated, role changed. They never contain passwords, codes, secrets, tokens or report content; recipient and subject are validated against header injection; sends are fire-and-forget so a mail outage cannot fail or slow the action; logs record only a masked address and the subject.
- Password policy: 10+ characters, letters and digits, at most 72 bytes (bcrypt's limit; longer input would be silently truncated).
- Global DTO validation with whitelisting (`forbidNonWhitelisted`), UUID/enum/range checks.
- Role-based authorization enforced by backend guards; CHVs only see their own reports, sync history, analytics and map points. Other CHVs' reports return 404, so IDs cannot be probed.
- Admins cannot deactivate or demote themselves; report review only moves forward (atomic conditional update).
- The map endpoint never returns notes, symptoms or the reporting CHV. User search escapes `LIKE` wildcards.
- Helmet headers, `Cache-Control: no-store` on all API responses, JSON body size limit, CORS restricted to configured origins.
- Frontend CSP, `X-Frame-Options: DENY`, `nosniff`, `Permissions-Policy` limiting geolocation to self.
- Append-only audit trail (`audit_logs`, `GET /api/audit-logs`, ADMIN) of sign-ins, failed sign-ins, password and two-factor changes, user and location admin, report corrections, reviews and exports. It records IDs and field names only, never report content or the email typed into a failed sign-in.
- CHVs can only report for locations in their assigned county. They can correct their own report while it is SUBMITTED and less than 72 hours old.
- CSV export neutralises spreadsheet formula injection (`=`, `+`, `-`, `@` prefixes).
- No query/body logging; errors log only an action name, driver error code and request ID (`X-Request-Id`, also in every error body).
- Service worker never caches API responses or cross-origin requests.

Details: [docs/architecture.md](docs/architecture.md#security).

## Documentation

| Doc | Contents |
| --- | --- |
| [docs/architecture.md](docs/architecture.md) | Module layout, request pipeline, data flow, service worker |
| [docs/how-it-works.md](docs/how-it-works.md) | The offline-first loop, illustrated |
| [docs/api.md](docs/api.md) | Endpoints, auth, CSRF, errors, rate limits |
| [docs/database-schema.md](docs/database-schema.md) | Tables, enums, indexes, checks |
| [docs/development-plan.md](docs/development-plan.md) | Phased plan and what is done |

Verified on 2026-10-11 (Windows 11, Node 22.15, MariaDB 10.4.32):

- Backend unit tests: 96 pass (`npm run test:backend`). They cover validators, configuration guards, the session guard, session-bound CSRF, persistent revocation, IP-aware lockout, TOTP (RFC 6238 vectors), secret encryption, CSV escaping, the report county and correction policies, user admin rules, roles, error mapping and idempotent sync.
- Backend e2e tests: 20 pass (`npm run test:backend:e2e`, no database). They cover health and readiness, OpenAPI, request IDs, 401/403 on private and state-changing routes, CSRF (including planted cookies) and Origin checks, validation, 503 without MySQL, and security headers.
- HTTP suite: all 187 requests in `backend/test/http/*.http` pass against MariaDB (`npm run test:backend:http`). It exercises every endpoint end to end, including the negative and authorization cases and a full two-factor lifecycle with real codes.
- Verified by hand: a logged-out session cookie is still rejected after the API restarts.
- CI (`.github/workflows/ci.yml`) runs the same checks on MySQL 8.4 for every push and pull request. It has not run yet: its first run happens when this branch is pushed.
- `npm run dev` starts both apps; all 8 routes, the manifest and `sw.js` return 200.
- `npm run typecheck`, `npm run lint` and `npm run build` pass for both apps.

## HTTP test suite

`backend/test/http/` holds `.http` request files in [httpyac](https://httpyac.github.io/) format. Every request asserts its expected status and body:

| File | Covers |
| --- | --- |
| `01-health-auth.http` | health, CSRF, Origin checks, login validation, generic login errors, cookies, logout and revocation |
| `02-chv-reports-sync.http` | locations, report create/idempotent retry/validation/mass assignment, CHV scoping, filters, sync batches, sync history, analytics, map |
| `03-admin-users-review.http` | user CRUD, search, self-protection, locations, admin-wide reporting, review workflow, password change/reset, deactivation, lockout |
| `04-hardening.http` | readiness, OpenAPI, request IDs, session-bound CSRF, report correction and county policy, CSV export and formula injection, audit trail, sign-out everywhere, two-factor setup/enable/login/replay/reset/disable |

Run the whole suite:

```bash
npm run test:backend:http
```

The runner (`backend/scripts/http-test.mjs`) drops and recreates a dedicated test database (`<DB_NAME>_http_test`). It refuses any name that does not end in `_test`. It then migrates and seeds that database, starts the built API on port 3101 with rate limiting disabled, runs the files in order, and stops the API. Your development database is not touched.

To run the files by hand, use the httpyac VS Code extension or CLI with the `dev` environment (`http-client.env.json`) against `npm run dev`. The files are re-runnable against a seeded database because they create fresh IDs and accounts each time. With rate limiting on, send requests at a normal pace: login allows 5 per minute.

## Known limitations

- **IndexedDB data is not encrypted at rest;** anyone with access to an unlocked device profile can read queued reports. Browsers may evict storage under pressure (`navigator.storage.persist()` is requested on app load).
- Lockout counters and the 10-second session-state cache are in memory (per process, reset on restart). Session revocations are in MySQL. Use a shared store such as Redis for lockouts if you run several instances.
- Audit writes are best effort: if one fails after the action succeeded, the action stands and the failure is logged as `AUDIT WRITE FAILED`. For tamper resistance, give the app's DB user only `INSERT, SELECT` on `audit_logs`.
- The OpenAPI document (`/api/docs/openapi.json`) is served only outside production, as JSON without Swagger UI. The API's CSP stays `default-src 'none'`, so open the JSON in any OpenAPI viewer.
- CSP permits `'unsafe-inline'` scripts because Next.js injects inline bootstrap code. Nonce-based CSP is a possible upgrade.
- Production needs HTTPS (secure cookies, service workers, geolocation), a dedicated least-privilege DB user, backups, and log retention policies.
- SMS, AI prediction and national HIS integration are out of scope.
