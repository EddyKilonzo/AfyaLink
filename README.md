# AfyaLink

**Design and Development of AfyaLink: An Offline-First Community Health Reporting System for Rural Kenya.**

*From Community Reports to Faster Health Action.*

AfyaLink lets Community Health Volunteers (CHVs) record community health reports on a phone, keep them while offline, and synchronize them to a central MySQL database when connectivity returns. Administrators get reporting dashboards and disease maps.

> Academic prototype. Not integrated with any national health system and not production-ready. All bundled data is synthetic.

## Repository layout

```text
afyalink/
├── frontend/              Next.js 16 (App Router, React 19, TypeScript, Tailwind v4)
│   ├── public/            sw.js (service worker), icons
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
│   ├── src/               auth, users, locations, reports, analytics, sync, database, common, health
│   └── test/              e2e tests (Vitest + supertest) and http/ (.http request suite)
├── docs/                  architecture, database schema, API, development plan
├── package.json           root scripts (concurrently)
├── .env.example
└── .gitignore
```

## Requirements

- Node.js **22.12+** (24 LTS recommended; the Nest CLI tooling warns below 22.22)
- npm 10+
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
| `npm test` | Backend unit tests + e2e tests (Vitest, no database needed) |
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
| `LOGIN_MAX_FAILURES`, `LOGIN_LOCKOUT_MINUTES` | backend | Per-account lockout. |
| `RATE_LIMIT_DISABLED` | backend | `true` turns off rate limiting for local test runs. Startup fails if set in production. |
| `HTTP_TEST_DB_NAME`, `HTTP_TEST_PORT` | HTTP test runner | Default `<DB_NAME>_http_test` and `3101`. The name must end in `_test`. |

The backend reads `backend/.env`, then the root `.env`. The frontend copies **only** `NEXT_PUBLIC_*` keys from the root `.env`, so server secrets never enter the browser bundle or the Next.js process.

## Security summary

- HTTP-only, `SameSite=Lax` session cookie (signed JWT with `jti`); nothing secret in `localStorage`.
- Double-submit CSRF token (`GET /api/auth/csrf` → `X-CSRF-Token` header) plus an Origin allow-list check on every state-changing request.
- bcrypt (cost 12) password hashing; constant-time-ish login (dummy hash for unknown emails); generic error messages.
- Rate limiting per IP (burst 30/10 s, 120/min; login 5/min, sync and CSRF 30/min) plus per-account lockout.
- Server-side session revocation on logout. Every request also checks the user's current role and active flag in the database (cached for 10 s, cleared on change), so deactivation and role changes take effect on existing sessions. Password change/reset, deactivation and role change end all of a user's sessions (`users.tokens_valid_after`); reactivating an account does not revive them.
- Password policy: 10+ characters, letters and digits, at most 72 bytes (bcrypt's limit; longer input would be silently truncated).
- Global DTO validation with whitelisting (`forbidNonWhitelisted`), UUID/enum/range checks.
- Role-based authorization enforced by backend guards; CHVs only see their own reports, sync history, analytics and map points. Other CHVs' reports return 404, so IDs cannot be probed.
- Admins cannot deactivate or demote themselves; report review only moves forward (atomic conditional update).
- The map endpoint never returns notes, symptoms or the reporting CHV. User search escapes `LIKE` wildcards.
- Helmet headers, `Cache-Control: no-store` on all API responses, JSON body size limit, CORS restricted to configured origins.
- Frontend CSP, `X-Frame-Options: DENY`, `nosniff`, `Permissions-Policy` limiting geolocation to self.
- No query/body logging; errors log only an action name and driver error code.
- Service worker never caches API responses or cross-origin requests.

Details: [docs/architecture.md](docs/architecture.md#security).

## Testing status

Verified on 2026-10-11 (Windows 11, Node 22.15, MariaDB 10.4.32):

- Backend unit tests: 59 pass (`npm run test:backend`). They cover validators, configuration guards, the session guard (revocation, deactivation, role from DB, `tokens_valid_after`), user admin rules, CSRF, roles, error mapping, lockout and idempotent sync.
- Backend e2e tests: 14 pass (`npm run test:backend:e2e`, no database). They cover health, 401/403 on private and state-changing routes, CSRF and Origin checks, validation, 503 without MySQL, and security headers.
- HTTP suite: all 123 requests in `backend/test/http/*.http` pass against MariaDB (`npm run test:backend:http`). It exercises every endpoint end to end, including the negative and authorization cases.
- `npm run dev` starts both apps; all 8 routes, the manifest and `sw.js` return 200.
- `npm run typecheck`, `npm run lint` and `npm run build` pass for both apps.

## HTTP test suite

`backend/test/http/` holds `.http` request files in [httpyac](https://httpyac.github.io/) format. Every request asserts its expected status and body:

| File | Covers |
| --- | --- |
| `01-health-auth.http` | health, CSRF, Origin checks, login validation, generic login errors, cookies, logout and revocation |
| `02-chv-reports-sync.http` | locations, report create/idempotent retry/validation/mass assignment, CHV scoping, filters, sync batches, sync history, analytics, map |
| `03-admin-users-review.http` | user CRUD, search, self-protection, locations, admin-wide reporting, review workflow, password change/reset, deactivation, lockout |

Run the whole suite:

```bash
npm run test:backend:http
```

The runner (`backend/scripts/http-test.mjs`) drops and recreates a dedicated test database (`<DB_NAME>_http_test`). It refuses any name that does not end in `_test`. It then migrates and seeds that database, starts the built API on port 3101 with rate limiting disabled, runs the three files in order, and stops the API. Your development database is not touched.

To run the files by hand, use the httpyac VS Code extension or CLI with the `dev` environment (`http-client.env.json`) against `npm run dev`. The files are re-runnable against a seeded database because they create fresh IDs and accounts each time. With rate limiting on, send requests at a normal pace: login allows 5 per minute.

## Known limitations

- **UI is placeholder-only.** Final screens wait on the agreed design. The data, offline and sync layers already exist (`frontend/src/features`, `lib`, `services`), but the routes don't call them yet. So the offline flow in the browser (save offline → reload → reconnect → synced) has **not** been tested end to end through the UI. The server half of the flow has been tested.
- IndexedDB data is not encrypted at rest; anyone with access to an unlocked device profile can read queued reports. Browsers may evict storage under pressure (call `navigator.storage.persist()` once the UI is built).
- Lockout and session revocation are held in memory: they are per process and reset on restart. Use Redis or a DB table if you run multiple instances.
- CSP permits `'unsafe-inline'` scripts because Next.js injects inline bootstrap code. Nonce-based CSP is a possible upgrade.
- Production needs HTTPS (secure cookies, service workers, geolocation), a dedicated least-privilege DB user, backups, and log retention policies.
- User management, password reset and report review exist in the API but have no UI yet. Password reset is admin-driven: there is no email-based self-service reset. SMS, AI prediction and national HIS integration are out of scope.
