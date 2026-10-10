-- AfyaLink initial schema (MySQL 8.0+ / MariaDB 10.5+)
-- Applied by `npm run db:migrate` (backend/scripts/db.mjs).
-- Kept in sync with the TypeORM entities in backend/src/database/entities.

-- ---------------------------------------------------------------------------
-- locations: administrative units a CHV serves (county > sub-county > ward > village)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS locations (
  id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  county      VARCHAR(80)     NOT NULL,
  sub_county  VARCHAR(80)     NOT NULL,
  ward        VARCHAR(80)     NOT NULL,
  village     VARCHAR(120)    NULL,
  latitude    DECIMAL(9,6)    NULL,
  longitude   DECIMAL(9,6)    NULL,
  created_at  DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_locations_unit (county, sub_county, ward, village),
  CONSTRAINT chk_locations_lat CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  CONSTRAINT chk_locations_lng CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- users: CHVs and administrators. Role enum: CHV | ADMIN
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id             CHAR(36)              NOT NULL,
  full_name      VARCHAR(120)          NOT NULL,
  email          VARCHAR(160)          NOT NULL,
  phone          VARCHAR(20)           NULL,
  password_hash  VARCHAR(100)          NOT NULL,
  role           ENUM('CHV','ADMIN')   NOT NULL DEFAULT 'CHV',
  location_id    INT UNSIGNED          NULL,
  is_active      TINYINT(1)            NOT NULL DEFAULT 1,
  last_login_at  DATETIME(6)           NULL,
  created_at     DATETIME(6)           NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at     DATETIME(6)           NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role),
  CONSTRAINT fk_users_location FOREIGN KEY (location_id)
    REFERENCES locations (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- health_reports: one community health observation.
-- id is a client-generated UUID v4, stable across offline sync retries.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS health_reports (
  id                 CHAR(36)      NOT NULL,
  chv_id             CHAR(36)      NOT NULL,
  location_id        INT UNSIGNED  NULL,
  category           ENUM('DISEASE_CASE','MATERNAL_HEALTH','CHILD_HEALTH','NUTRITION',
                          'WATER_SANITATION','DEATH','OTHER') NOT NULL,
  condition_name     VARCHAR(120)  NOT NULL,
  severity           ENUM('LOW','MODERATE','HIGH','CRITICAL') NOT NULL DEFAULT 'LOW',
  cases_count        INT UNSIGNED  NOT NULL DEFAULT 1,
  age_group          ENUM('UNDER_5','AGE_5_17','AGE_18_59','AGE_60_PLUS','MIXED') NOT NULL DEFAULT 'MIXED',
  symptoms           JSON          NULL,
  notes              TEXT          NULL,
  latitude           DECIMAL(9,6)  NULL,
  longitude          DECIMAL(9,6)  NULL,
  observed_at        DATETIME(6)   NOT NULL,
  client_created_at  DATETIME(6)   NOT NULL,
  status             ENUM('SUBMITTED','REVIEWED','ACTIONED') NOT NULL DEFAULT 'SUBMITTED',
  received_at        DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at         DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_reports_chv_observed (chv_id, observed_at),
  KEY idx_reports_category_observed (category, observed_at),
  KEY idx_reports_location (location_id),
  CONSTRAINT fk_reports_chv FOREIGN KEY (chv_id)
    REFERENCES users (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_reports_location FOREIGN KEY (location_id)
    REFERENCES locations (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_reports_cases CHECK (cases_count BETWEEN 1 AND 10000),
  CONSTRAINT chk_reports_lat CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  CONSTRAINT chk_reports_lng CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- sync_logs: audit trail of sync batches (counts only, never report content).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sync_logs (
  id               BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  user_id          CHAR(36)         NOT NULL,
  device_id        VARCHAR(64)      NULL,
  received_count   INT UNSIGNED     NOT NULL DEFAULT 0,
  created_count    INT UNSIGNED     NOT NULL DEFAULT 0,
  duplicate_count  INT UNSIGNED     NOT NULL DEFAULT 0,
  rejected_count   INT UNSIGNED     NOT NULL DEFAULT 0,
  status           ENUM('SUCCESS','PARTIAL','FAILED') NOT NULL,
  started_at       DATETIME(6)      NOT NULL,
  completed_at     DATETIME(6)      NOT NULL,
  PRIMARY KEY (id),
  KEY idx_sync_logs_user_started (user_id, started_at),
  CONSTRAINT fk_sync_logs_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
