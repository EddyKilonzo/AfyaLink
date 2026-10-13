-- AfyaLink migration 003 (PostgreSQL 15+)
-- 1. audit_logs: append-only record of security-relevant and admin actions.
--    Holds identifiers and field names only, never report content or passwords.
-- 2. revoked_sessions: logged-out session IDs (JWT jti) until they expire, so
--    a logout survives an API restart and is shared between API instances.
-- 3. users.mfa_*: optional TOTP two-factor sign-in. The secret is stored
--    encrypted (AES-256-GCM); mfa_last_step blocks reuse of a code.

CREATE TABLE IF NOT EXISTS audit_logs (
  id           BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
  actor_id     UUID          NULL,
  action       VARCHAR(48)   NOT NULL,
  target_type  VARCHAR(24)   NULL,
  target_id    VARCHAR(36)   NULL,
  ip_address   VARCHAR(45)   NULL,
  request_id   VARCHAR(64)   NULL,
  details      JSONB         NULL,
  created_at   TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id)
    REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_audit_actor_created ON audit_logs (actor_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_action_created ON audit_logs (action, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_target ON audit_logs (target_type, target_id);

CREATE TABLE IF NOT EXISTS revoked_sessions (
  jti         UUID          NOT NULL,
  user_id     UUID          NOT NULL,
  expires_at  TIMESTAMPTZ(6) NOT NULL,
  revoked_at  TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  PRIMARY KEY (jti),
  CONSTRAINT fk_revoked_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_revoked_expires ON revoked_sessions (expires_at);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS mfa_enabled    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS mfa_secret     VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS mfa_last_step  BIGINT NULL;