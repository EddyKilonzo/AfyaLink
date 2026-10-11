# Architecture

## Overview

```text
 CHV phone / browser                                   Server
┌──────────────────────────────────┐   HTTPS + cookie  ┌────────────────────────────┐
│ Next.js app (frontend/)          │ ────────────────▶ │ NestJS API (backend/)      │
│  • UI routes                     │   /api/*          │  • Guards: throttle → CSRF │
│  • AuthProvider / SyncProvider   │ ◀──────────────── │    → session → roles       │
│  • Dexie (IndexedDB) queue       │                   │  • Modules: auth, users,   │
│  • Service worker (app shell)    │                   │    reports, analytics,     │
└──────────────────────────────────┘                   │    sync, health            │
                                                       │  • TypeORM ─▶ MySQL        │
                                                       └────────────────────────────┘
```

Two independent apps share no code at runtime. Enums are mirrored by hand between `backend/src/database/entities/*.ts`, `backend/database/migrations/*.sql` and `frontend/src/types/index.ts`.

## Backend (NestJS 12, ESM)

| Module | Responsibility |
| --- | --- |
| `DatabaseModule` (global) | TypeORM DataSource with `manualInitialization`. `DatabaseService` connects in the background and retries every 15 s; `assertReady()` throws 503 while MySQL is unavailable. |
| `AuthModule` (global) | Login/logout/logout-all/me/csrf/change-password, JWT signing, `CsrfService` (session-bound tokens), `MfaService` (TOTP), `LoginAttemptsService` (per account+IP and per-account lockout), `SessionRevocationService` (MySQL-backed). |
| `AuditModule` (global) | `AuditService.record()` (best effort, append-only) and the read-only `GET /audit-logs`. |
| `UsersModule` | User lookups, session state for the guard (short cache), admin user management (list/search, create, update, deactivate, password reset). |
| `LocationsModule` | Administrative units for the report form and the map; ADMIN create. |
| `ReportsModule` | List/get/create reports. `createIdempotent()` is the single create path; `updateStatus()` is the ADMIN review path. |
| `SyncModule` | Batch upload with per-item results, `sync_logs` audit rows and sync history. |
| `AnalyticsModule` | Aggregates (category, severity, status, county, day, top conditions) and map points without free text. |
| `HealthController` | `GET /api/health`, public, unthrottled. |
| `common/` | Decorators (`@Public`, `@Roles`, `@CurrentUser`), guards, `toHttpException`, `AllExceptionsFilter`, pagination DTO. |

### Request pipeline

1. Helmet headers, `Cache-Control: no-store`, cookie parser, JSON body limit, CORS allow-list.
2. Global guards in order: `ThrottlerGuard` → `CsrfGuard` → `SessionGuard` → `RolesGuard`.
3. `ValidationPipe` (whitelist, forbid unknown properties, transform).
4. Controller → service. Every controller and service method wraps its body in `try/catch` and rethrows through `toHttpException`, which passes `HttpException`s through and maps driver errors: duplicate key → 409, constraint violations → 400, connection failures → 503, anything else → generic 500.
5. `AllExceptionsFilter` is the final safety net. It emits `{ statusCode, error, message, path, timestamp }` and never a stack trace or SQL.

## Frontend (Next.js 16 App Router)

- `cacheComponents` and `partialPrefetching` are enabled (Next 16 defaults). Routes are static shells; user data loads client-side with the session cookie, so no private data is prerendered or cached by the CDN.
- `lib/api.ts`: one `fetch` wrapper. It sends `credentials: "include"`, attaches the CSRF header and enforces a timeout. It throws a typed `ApiError` (`kind: network | timeout | http | parse`, plus `isRetryable` and `isUnauthorized`) and refreshes the CSRF token once on a CSRF rejection.
- `lib/db.ts`: Dexie schema `afyalink` v1, with tables `reports` and `meta` (deviceId, cached profile, lastSyncAt).
- `features/auth/auth-context.tsx`: session state. If the API is unreachable, a previously signed-in user's non-secret profile is loaded from IndexedDB so recording can continue offline. The server still authenticates every sync.
- `features/sync/`: sync engine and provider (below).
- `public/sw.js`: app-shell service worker (below).

## Offline-first synchronization

```text
 saveReportLocally()            syncPendingReports()                   server
 ─────────────────▶ pending ──────────▶ syncing ── POST /api/sync ──▶ validate + insert
                       ▲                   │                            (PK = client UUID)
                       │   network/5xx/401 │
                       └───────────────────┤
                                           │ per-item result
                     failed ◀── rejected ──┤
          (retryable=false; manual retry)  │
                                           └── created | duplicate ──▶ synced
```

- **Stable IDs.** Each report gets `crypto.randomUUID()` when it is first saved. That ID is the `health_reports` primary key.
- **Idempotency.** The server inserts by primary key. If the ID already exists for the same CHV, it answers `duplicate` instead of creating a row. If two inserts race, the duplicate-key error resolves the same way. If the ID belongs to a different user, the report is `rejected`.
- **Confirmation before `synced`.** The client marks a report `synced` only when the server answers `created` or `duplicate` for that ID.
- **Failures.**
  - Network errors, 5xx, 503 and 429 return the batch to `pending` with exponential backoff (15 s doubling, capped at 30 min, plus jitter).
  - Server validation rejections become `failed` with `retryable=false` and only retry after a manual action.
  - A 401 pauses sync until the user signs in again.
- **Triggers.** App start, the `online` event, tab visibility or focus, and a 60 s interval while work is pending. Background Sync is not required.
- **Crash safety.** Reports stuck in `syncing` for more than 2 minutes (for example, the tab closed mid-request) are reset to `pending` on the next run. Only one sync runs at a time per tab.
- **Ownership.** Each queued report stores `ownerId`. Only that user's session uploads it, so a shared device never syncs one CHV's reports under another account.

## PWA

- `app/manifest.ts` generates `/manifest.webmanifest`. Icons are SVG.
- `public/sw.js` is registered in production builds only. In development it is unregistered so hot reload never serves stale files.
- Caching policy:
  - Same-origin `/_next/static/*`: cache-first.
  - Page navigations: network-first with a cached fallback.
  - Icons: stale-while-revalidate.
  - Never cached: the API (it is cross-origin), any `/api/` path, non-GET requests, and responses marked `no-store` or `private`.
- HTTPS is required for service workers outside `localhost`.

## Security

| Concern | Control |
| --- | --- |
| Session theft via XSS | Session JWT in an HTTP-only cookie. JS never sees it. CSP restricts script and connect sources. |
| CSRF | `SameSite=Lax` cookies, a double-submit token (HTTP-only cookie plus an in-memory header copy), and an Origin allow-list on unsafe methods. |
| Brute force | Per-IP throttling (login 5/min) and a per-account lockout (5 failures, then 15 min). bcrypt cost 12. A dummy-hash comparison hides whether an account exists. |
| Session replay after logout | The `jti` is revoked server-side until the token expires, stored in `revoked_sessions` so it survives restarts and is shared by instances. `logout-all` ends every session. |
| CSRF via planted cookies | The CSRF token carries an HMAC of the session ID (`CsrfService`), so a token minted for another session or an unsigned value is rejected. |
| Stolen password (admins) | Optional TOTP two-factor; encrypted secret; single-use codes; admin reset for lost devices. |
| Lockout abuse (denial of service) | Failures counted per account+IP (5) with a higher per-account cap (25), so one attacker cannot lock the real user out. |
| Repudiation / insider misuse | `audit_logs` records sign-ins, admin actions, reviews, corrections and exports with actor, IP and request ID. |
| CSV/formula injection | Export prefixes formula-like text with `'`. |
| Reporting outside one's area | CHVs are limited to locations in their assigned county. |
| Stale privileges | `SessionGuard` reads the current role and active flag from the database (10 s cache, cleared on change). `users.tokens_valid_after` ends all sessions on password change/reset, deactivation or role change. |
| Weak or truncated passwords | Policy: 10+ characters, letters and digits, at most 72 bytes (bcrypt's input limit). |
| Broken access control | Global `SessionGuard` and `RolesGuard`. Reports are scoped by `chvId` in queries. Other users' reports return 404, not 403. |
| Mass assignment | DTO whitelist with `forbidNonWhitelisted`. `chvId` always comes from the session. |
| Injection | Parameterized TypeORM queries only. SQL runner validates `DB_NAME`. |
| Data leakage | `Cache-Control: no-store` on the API. The service worker skips the API. Analytics are aggregates only. Logs carry action names and error codes, never bodies or SQL. |
| DoS / abuse | Body size limit, sync batch ≤ 50, paginated lists (limit ≤ 100), throttling. |
| Transport | HSTS and `upgrade-insecure-requests` in production. Secure cookies are enforced in production. HTTPS-only CORS origins in production. |
| Misconfiguration | Startup fails in production without a strong session secret, with insecure cookies, or with `http://` or `*` CORS origins. |
