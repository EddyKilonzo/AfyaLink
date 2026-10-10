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
- **Rate limits.** Per IP: 30 requests per 10 s and 120 per minute. `X-RateLimit-*` headers are returned.
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
| GET | `/users` | session | ADMIN | implemented |
| GET | `/reports` | session | CHV, ADMIN | implemented (CHV: own only) |
| POST | `/reports` | session + CSRF | CHV, ADMIN | implemented (idempotent) |
| GET | `/reports/:id` | session | CHV, ADMIN | implemented (CHV: own only) |
| GET | `/analytics/summary` | session | CHV, ADMIN | implemented (CHV: own scope) |
| POST | `/sync` | session + CSRF | CHV, ADMIN | implemented (30/min) |

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

### `GET /reports`

Query parameters: `page`, `limit`, `category`, `severity`, `from`, `to` (ISO dates, applied to `observedAt`). Results are sorted by `observedAt` descending.

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

Unknown fields such as `chvId` are rejected with 400.

### `GET /reports/:id`

`:id` must be a UUID (otherwise 400). Reports owned by other CHVs return 404.

### `GET /analytics/summary?days=30`

`days` is clamped to 1–365. Response:

```json
{
  "scope": "own",
  "periodDays": 30,
  "since": "…",
  "totals": { "reports": 6, "cases": 19 },
  "byCategory": [{ "category": "DISEASE_CASE", "count": 3 }],
  "bySeverity": [{ "severity": "HIGH", "count": 3 }],
  "byDay": [{ "day": "2026-10-01", "count": 1 }],
  "topConditions": [{ "condition": "Malaria", "cases": 5 }]
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
