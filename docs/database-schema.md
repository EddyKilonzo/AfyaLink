# Database schema

MySQL 8.0+ / MariaDB 10.5+, InnoDB, `utf8mb4_unicode_ci`. All timestamps are stored in UTC (`DATETIME(6)`, TypeORM `timezone: 'Z'`).

- Schema source of truth: [`backend/database/migrations/`](../backend/database/migrations/): `001_initial_schema.sql`, then `002_review_and_session_hardening.sql` (review fields and `users.tokens_valid_after`), `003_audit_revocation_mfa.sql` (`audit_logs`, `revoked_sessions`, `users.mfa_*`)
- ORM mapping: `backend/src/database/entities/*.entity.ts` (`synchronize` is **off**, so the entities must match the SQL)
- Synthetic seed data: [`backend/database/seeds/001_dev_seed.sql`](../backend/database/seeds/001_dev_seed.sql)

## Setup

```bash
# .env must contain DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD (or DATABASE_URL)
npm run db:migrate   # CREATE DATABASE IF NOT EXISTS (if permitted) + apply new migrations
npm run db:seed      # apply new seed files (blocked when NODE_ENV=production)
npm run db:status    # list applied files
```

`backend/scripts/db.mjs` records applied files in `schema_migrations(name, kind, applied_at)` and runs each file once, in filename order. To change the schema, add `002_<description>.sql` instead of editing an applied file, and update the matching entity.

Recommended least-privilege account:

```sql
CREATE USER 'afyalink_app'@'localhost' IDENTIFIED BY '<strong password>';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES, DROP ON afyalink.* TO 'afyalink_app'@'localhost';
```

After migrations are applied, the runtime API only needs `SELECT, INSERT, UPDATE, DELETE`.

## Entity relationships

```text
locations 1 ──── * users 1 ──── * health_reports * ──── 0..1 locations
                    │
                    └── 1 ──── * sync_logs
```

## Enums

| Enum | Values | Used in |
| --- | --- | --- |
| Role | `CHV`, `ADMIN` | `users.role` |
| Report category | `DISEASE_CASE`, `MATERNAL_HEALTH`, `CHILD_HEALTH`, `NUTRITION`, `WATER_SANITATION`, `DEATH`, `OTHER` | `health_reports.category` |
| Severity | `LOW`, `MODERATE`, `HIGH`, `CRITICAL` | `health_reports.severity` |
| Age group | `UNDER_5`, `AGE_5_17`, `AGE_18_59`, `AGE_60_PLUS`, `MIXED` | `health_reports.age_group` |
| Report status | `SUBMITTED`, `REVIEWED`, `ACTIONED` | `health_reports.status` |
| Sync status | `SUCCESS`, `PARTIAL`, `FAILED` | `sync_logs.status` |

The browser-only sync states (`pending`, `syncing`, `synced`, `failed`) live in IndexedDB, not MySQL.

## Tables

### `locations`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | INT UNSIGNED PK AI | |
| `county`, `sub_county`, `ward` | VARCHAR(80) | required |
| `village` | VARCHAR(120) NULL | |
| `latitude`, `longitude` | DECIMAL(9,6) NULL | CHECK ranges |
| `created_at` | DATETIME(6) | default now |

Unique: `(county, sub_county, ward, village)`.

### `users`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | CHAR(36) PK | UUID |
| `full_name` | VARCHAR(120) | |
| `email` | VARCHAR(160) UNIQUE | stored lower-case |
| `phone` | VARCHAR(20) NULL | |
| `password_hash` | VARCHAR(100) | bcrypt; never selected by default |
| `role` | ENUM role | default `CHV`, indexed |
| `location_id` | INT UNSIGNED NULL | FK → `locations.id`, `ON DELETE SET NULL` |
| `is_active` | TINYINT(1) | inactive users cannot sign in |
| `last_login_at` | DATETIME(6) NULL | |
| `mfa_enabled` | TINYINT(1) | two-factor on (migration 003) |
| `mfa_secret` | VARCHAR(255) NULL | AES-256-GCM sealed TOTP secret, bound to the user ID; never selected by default (migration 003) |
| `mfa_last_step` | BIGINT UNSIGNED NULL | last accepted TOTP step, blocks code reuse (migration 003) |
| `tokens_valid_after` | DATETIME(6) NULL | sessions issued before this are rejected; set on password change/reset, deactivation, role change (migration 002) |
| `created_at`, `updated_at` | DATETIME(6) | auto |

### `health_reports`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | CHAR(36) PK | **client-generated UUID v4**: the idempotency key for sync |
| `chv_id` | CHAR(36) | FK → `users.id`, `ON DELETE RESTRICT`; always set from the session |
| `location_id` | INT UNSIGNED NULL | FK → `locations.id`, `ON DELETE SET NULL` |
| `category` | ENUM category | |
| `condition_name` | VARCHAR(120) | |
| `severity` | ENUM severity | default `LOW` |
| `cases_count` | INT UNSIGNED | CHECK 1–10000 |
| `age_group` | ENUM age group | default `MIXED` |
| `symptoms` | JSON NULL | array of strings |
| `notes` | TEXT NULL | UI asks users not to include names or ID numbers |
| `latitude`, `longitude` | DECIMAL(9,6) NULL | CHECK ranges |
| `observed_at` | DATETIME(6) | when the CHV observed it |
| `client_created_at` | DATETIME(6) | when it was saved on the device |
| `status` | ENUM report status | default `SUBMITTED`; ADMIN moves it forward only |
| `reviewed_by` | CHAR(36) NULL | FK → `users.id`, `ON DELETE SET NULL` (migration 002) |
| `reviewed_at` | DATETIME(6) NULL | (migration 002) |
| `review_note` | VARCHAR(500) NULL | (migration 002) |
| `received_at` | DATETIME(6) | server receipt time |
| `updated_at` | DATETIME(6) | auto |

Indexes: `(chv_id, observed_at)`, `(category, observed_at)`, `(location_id)`, `(status, observed_at)`.

No patient names or identifiers are stored; reports are aggregate observations.

### `sync_logs`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | BIGINT UNSIGNED PK AI | |
| `user_id` | CHAR(36) | FK → `users.id`, `ON DELETE CASCADE` |
| `device_id` | VARCHAR(64) NULL | random per-device ID, not hardware-derived |
| `received_count`, `created_count`, `duplicate_count`, `rejected_count` | INT UNSIGNED | |
| `status` | ENUM sync status | |
| `started_at`, `completed_at` | DATETIME(6) | |

Index: `(user_id, started_at)`. Holds counts only, never report content.

## Notes

- The seed file uses `INSERT IGNORE` on fixed IDs, so it can be re-run safely. All seed accounts share the development password `AfyaLink#Dev2026`.
- MariaDB stores `JSON` as `LONGTEXT` with a validity check; TypeORM handles both engines.

### `audit_logs` (migration 003)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | BIGINT UNSIGNED PK AI | |
| `actor_id` | CHAR(36) NULL | FK → `users.id`, `ON DELETE SET NULL`; NULL for failed sign-ins of unknown accounts |
| `action` | VARCHAR(48) | e.g. `report.review`; full list in docs/api.md |
| `target_type`, `target_id` | VARCHAR NULL | `user` / `report` / `location` and its ID |
| `ip_address` | VARCHAR(45) NULL | client IP (respects `TRUST_PROXY`) |
| `request_id` | VARCHAR(64) NULL | matches `X-Request-Id` and log lines |
| `details` | JSON NULL | scalars only: field names, statuses, counts, filters |
| `created_at` | DATETIME(6) | |

Indexes: `(created_at)`, `(actor_id, created_at)`, `(action, created_at)`, `(target_type, target_id)`. Append-only from the API. For tamper resistance, grant the runtime DB user only `INSERT, SELECT` on this table.

### `revoked_sessions` (migration 003)

| Column | Type | Notes |
| --- | --- | --- |
| `jti` | CHAR(36) PK | session ID from the JWT |
| `user_id` | CHAR(36) | FK → `users.id`, `ON DELETE CASCADE` |
| `expires_at` | DATETIME(6) | indexed; rows past this are pruned |
| `revoked_at` | DATETIME(6) | |
