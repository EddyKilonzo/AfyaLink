-- AfyaLink migration 003 (MySQL 8.0+ / MariaDB 10.5+)
-- 1. audit_logs: append-only record of security-relevant and admin actions.
--    Holds identifiers and field names only, never report content or passwords.
-- 2. revoked_sessions: logged-out session IDs (JWT jti) until they expire, so
--    a logout survives an API restart and is shared between API instances.
-- 3. users.mfa_*: optional TOTP two-factor sign-in. The secret is stored
--    encrypted (AES-256-GCM); mfa_last_step blocks reuse of a code.

CREATE TABLE IF NOT EXISTS audit_logs (
  id           BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  actor_id     CHAR(36)         NULL,
  action       VARCHAR(48)      NOT NULL,
  target_type  VARCHAR(24)      NULL,
  target_id    VARCHAR(36)      NULL,
  ip_address   VARCHAR(45)      NULL,
  request_id   VARCHAR(64)      NULL,
  details      JSON             NULL,
  created_at   DATETIME(6)      NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_audit_created (created_at),
  KEY idx_audit_actor_created (actor_id, created_at),
  KEY idx_audit_action_created (action, created_at),
  KEY idx_audit_target (target_type, target_id),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id)
    REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS revoked_sessions (
  jti         CHAR(36)     NOT NULL,
  user_id     CHAR(36)     NOT NULL,
  expires_at  DATETIME(6)  NOT NULL,
  revoked_at  DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (jti),
  KEY idx_revoked_expires (expires_at),
  CONSTRAINT fk_revoked_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE users
  ADD COLUMN mfa_enabled    TINYINT(1)       NOT NULL DEFAULT 0 AFTER is_active,
  ADD COLUMN mfa_secret     VARCHAR(255)     NULL AFTER mfa_enabled,
  ADD COLUMN mfa_last_step  BIGINT UNSIGNED  NULL AFTER mfa_secret;
