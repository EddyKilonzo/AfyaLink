# API reference

Base URL: `http://localhost:3001/api` (global prefix `/api`). JSON only.

## Conventions

- **Auth.** An HTTP-only session cookie `afya_session` is set by `POST /auth/login`. Browser clients must send `credentials: "include"`.
- **CSRF.** For `POST`, `PUT`, `PATCH` and `DELETE`, first call `GET /auth/csrf`, then send the returned token as `X-CSRF-Token`. The token must match the HTTP-only `afya_csrf` cookie. If an `Origin` header is present, it must be in `CORS_ORIGINS`.
- **Errors.** Every error uses the same shape:
  ```json
  { "statusCode": 400, "error": "BadRequest", "message": ["casesCount must not be less than 1"], "path": "/api/reports", "timestamp": "2026-10-10T03:41:59.553Z" }
  ```
  | Status | Meaning |
  | --- | --- |
  | 400 | Validation failed |
  | 401 | No session, expired session, or revoked session |
  | 403 | Wrong role, CSRF failure or bad origin |
  | 404 | Not found, or not yours |
  | 409 | Conflict |
  | 429 | Rate limited or account locked |
  | 503 | Database unavailable |
  | 500 | Unexpected; generic message only |
- **Sessions.** Each request re-checks the user's role and active flag in the database (cached ≤ 10 s, cleared on change). A password change or reset, a deactivation, or a role change ends all of that user's existing sessions.
- **Rate limits.** Per IP: 30 requests per 10 s and 120 per minute. `X-RateLimit-*` headers are returned. `RATE_LIMIT_DISABLED=true` turns limits off for local test runs only; startup fails if it is set in production.
- **Pagination.** `?page=1&limit=20` (limit ≤ 100). Responses look like `{ items, page, limit, total, totalPages }`.
- **Caching.** Every response has `Cache-Control: no-store`.

## Endpoints

| Method | Path | Auth | Roles | Status |
| --- | --- | --- | --- | --- |
| GET | `/health` | public | – | implemented |
| GET | `/auth/csrf` | public | – | implemented (30/min) |
| POST | `/auth/login` | public + CSRF | – | implemented (5/min/IP + account lockout) |
| POST | `/auth/logout` | CSRF | – | implemented (revokes session) |
| GET | `/auth/me` | session | any | implemented |
| POST | `/auth/change-password` | session + CSRF | any | implemented (5/min; ends other sessions) |
| GET | `/users` | session | ADMIN | implemented (filters: `role`, `isActive`, `q`) |
| GET | `/users/:id` | session | ADMIN | implemented |
| POST | `/users` | session + CSRF | ADMIN | implemented (20/min) |
| PATCH | `/users/:id` | session + CSRF | ADMIN | implemented (no self-deactivate/demote) |
| POST | `/users/:id/reset-password` | session + CSRF | ADMIN | implemented (10/min; ends that user's sessions) |
| GET | `/locations` | session | CHV, ADMIN | implemented (filter: `county`) |
| POST | `/locations` | session + CSRF | ADMIN | implemented |
| GET | `/reports` | session | CHV, ADMIN | implemented (CHV: own only) |
| POST | `/reports` | session + CSRF | CHV, ADMIN | implemented (idempotent) |
| GET | `/reports/:id` | session | CHV, ADMIN | implemented (CHV: own only) |
| PATCH | `/reports/:id/status` | session + CSRF | ADMIN | implemented (forward only) |
| GET | `/analytics/summary` | session | CHV, ADMIN | implemented (CHV: own scope) |
| GET | `/analytics/map` | session | CHV, ADMIN | implemented (CHV: own scope) |
| POST | `/sync` | session + CSRF | CHV, ADMIN | implemented (30/min) |
| GET | `/sync/logs` | session | CHV, ADMIN | implemented (CHV: own only) |

### `GET /health`

```json
{ "status": "ok", "service": "afyalink-backend", "database": "connected", "uptimeSeconds": 26, "timestamp": "…" }
```

`database` is one of `not_configured`, `connecting`, `connected` or `unavailable`. The endpoint always returns 200 while the process is up.

### `GET /auth/csrf`

Returns `{ "csrfToken": "…" }` and sets the `afya_csrf` cookie.

### `POST /auth/login`

Body: `{ "email": "chv.mwende@afyalink.test", "password": "AfyaLink#Dev2026" }`.

Returns `200 { user }` and sets `afya_session`. Wrong credentials and inactive accounts both get `401 "Invalid email or password."`. After 5 failures in 15 minutes the account returns 429 until the window passes.

### `POST /auth/logout`

Returns `204`. The cookie is cleared and the session ID is revoked server-side.

### `GET /auth/me`

Returns `200 { user }`, where `user` is `{ id, fullName, email, phone, role, locationId, isActive, lastLoginAt }`.

### `POST /auth/change-password`

Body: `{ "currentPassword": "…", "newPassword": "…" }`. Returns `200 { user }` and sets a fresh `afya_session` cookie. All other sessions of the user stop working.

Errors: `400 "Current password is incorrect."`, `400` when the new password equals the current one or fails the policy.

**Password policy** (also used by `POST /users` and reset): 10+ characters, at least one letter and one digit, no leading or trailing whitespace, at most 72 bytes.

### `GET /users`, `GET /users/:id`

Query parameters: `page`, `limit`, `role` (`CHV`|`ADMIN`), `isActive` (`true`|`false`), `q` (case-insensitive match on name or email; `%` and `_` match literally). Single-user responses look like `{ user }`. Password hashes are never returned.

### `POST /users`

```json
{ "fullName": "Demo CHV", "email": "chv.new@afyalink.test", "phone": "+254700000010", "role": "CHV", "locationId": 1, "password": "Initial1234pass" }
```

Returns `201 { user }`. `409` if the email exists. `fullName` allows letters, spaces, `.`, `'` and `-`; `phone` is 7–15 digits with an optional `+`. Other fields (`isActive`, `passwordHash`, `id`) are rejected.

### `PATCH /users/:id`

Any of `fullName`, `phone`, `role`, `locationId`, `isActive`. `null` clears `phone` or `locationId`. Returns `200 { user }`.

- `403` if an admin tries to deactivate or demote themselves.
- `400` for an empty body or for fields that cannot be changed here (email, password).
- Deactivation and role changes end the user's existing sessions. Reactivating does not bring them back.

### `POST /users/:id/reset-password`

Body: `{ "password": "…" }`. Returns `204` and ends all of the user's sessions. Admins change their own password with `/auth/change-password` instead (`403` here).

### `GET /locations`, `POST /locations`

`GET` returns `{ items: Location[] }`, ordered by county, sub-county, ward and village, with an optional `?county=` filter. `POST` (ADMIN) takes `{ county, subCounty, ward, village?, latitude?, longitude? }` and returns `201` with the location, or `409` if the same unit exists.

### `GET /reports`

Query parameters: `page`, `limit`, `category`, `severity`, `status`, `locationId`, `chvId` (ADMIN only; CHVs always get their own), `from`, `to` (ISO dates applied to `observedAt`; `from` must not be after `to`). Results are sorted by `observedAt` descending.

### `POST /reports`

```json
{
  "id": "249b4409-4a2e-42b6-b6f2-6f8c59dd7e34",
  "category": "DISEASE_CASE",
  "conditionName": "Cholera (suspected)",
  "severity": "HIGH",
  "casesCount": 3,
  "ageGroup": "MIXED",
  "symptoms": ["diarrhoea", "vomiting"],
  "notes": "optional",
  "locationId": 1,
  "latitude": -1.36,
  "longitude": 38.01,
  "observedAt": "2026-10-10T03:00:00Z",
  "clientCreatedAt": "2026-10-10T03:05:00Z"
}
```

| Response | When |
| --- | --- |
| `201 { outcome: "created", report }` | New ID |
| `200 { outcome: "duplicate", report }` | Same ID already stored for this user (safe retry) |
| `409` | ID belongs to another user |

Unknown fields such as `chvId` or `status` are rejected with 400. `observedAt` and `clientCreatedAt` must be real calendar dates no more than 10 minutes in the future. A `locationId` that does not exist returns 400.

### `GET /reports/:id`

`:id` must be a UUID (otherwise 400). Reports owned by other CHVs return 404.

### `PATCH /reports/:id/status` (ADMIN)

Body: `{ "status": "REVIEWED" | "ACTIONED", "reviewNote"?: "≤ 500 chars" }`. Allowed transitions are `SUBMITTED → REVIEWED`, `SUBMITTED → ACTIONED` and `REVIEWED → ACTIONED`. Returns the updated report with `reviewedById`, `reviewedAt` and `reviewNote`. Any other transition returns `409`, and an unknown report returns `404`.

### `GET /analytics/summary?days=30`

`days` must be 1–365 (default 30); other values return 400. Response:

```json
{
  "scope": "own",
  "periodDays": 30,
  "since": "…",
  "totals": { "reports": 6, "cases": 19 },
  "byCategory": [{ "category": "DISEASE_CASE", "count": 3 }],
  "bySeverity": [{ "severity": "HIGH", "count": 3 }],
  "byDay": [{ "day": "2026-10-01", "count": 1 }],
  "topConditions": [{ "condition": "Malaria", "cases": 5 }],
  "byStatus": [{ "status": "SUBMITTED", "count": 4 }],
  "pendingReview": 4,
  "byCounty": [{ "county": "Kitui", "reports": 5, "cases": 16 }]
}
```

### `GET /analytics/map?days=30&category=&severity=`

Points for the disease map. A report without its own coordinates uses its location's coordinates; reports with neither are left out. At most 2000 points are returned, and `truncated` is `true` when more exist. Notes, symptoms and the reporting CHV are never included.

```json
{
  "scope": "all", "periodDays": 30, "since": "…", "truncated": false,
  "points": [{ "id": "…", "category": "DISEASE_CASE", "conditionName": "Malaria", "severity": "MODERATE", "casesCount": 4,
               "status": "SUBMITTED", "observedAt": "…", "county": "Kitui", "ward": "Miambani", "latitude": -1.3675, "longitude": 38.0112 }]
}
```

### `POST /sync`

Body: `{ "deviceId": "dev-abc123", "reports": [ <report as in POST /reports>, … ] }`. At most 50 reports per request.

Each item is validated on its own, so one bad report does not fail the batch:

```json
{
  "status": "PARTIAL",
  "summary": { "received": 2, "created": 1, "duplicates": 0, "rejected": 1 },
  "results": [
    { "id": "…", "status": "created" },
    { "id": "…", "status": "rejected", "reason": "Invalid fields: casesCount" }
  ],
  "serverTime": "…"
}
```

The client marks a report synced only when its result is `created` or `duplicate`. If the database is down, the whole request returns 503 and the client retries later. Each batch writes one `sync_logs` row containing counts only.

### `GET /sync/logs`

Paginated sync history, newest first: `{ id, userId, deviceId, receivedCount, createdCount, duplicateCount, rejectedCount, status, startedAt, completedAt }`. CHVs see only their own. Admins see everything and can pass `?userId=`.

## HTTP test suite

Every endpoint above is exercised by `backend/test/http/*.http`, including the error cases. See the README for `npm run test:backend:http`.
