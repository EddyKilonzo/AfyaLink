-- AfyaLink migration 002 (MySQL 8.0+ / MariaDB 10.5+)
-- 1. users.tokens_valid_after: sessions issued before this instant are
--    rejected. Set on password change/reset, deactivation and role change, so
--    a leaked cookie dies with the old password and reactivating an account
--    does not bring its old sessions back.
-- 2. health_reports review fields: an ADMIN moves a report
--    SUBMITTED -> REVIEWED -> ACTIONED and the reviewer and time are recorded.

ALTER TABLE users
  ADD COLUMN tokens_valid_after DATETIME(6) NULL AFTER last_login_at;

ALTER TABLE health_reports
  ADD COLUMN reviewed_by  CHAR(36)     NULL AFTER status,
  ADD COLUMN reviewed_at  DATETIME(6)  NULL AFTER reviewed_by,
  ADD COLUMN review_note  VARCHAR(500) NULL AFTER reviewed_at,
  ADD KEY idx_reports_status_observed (status, observed_at),
  ADD CONSTRAINT fk_reports_reviewer FOREIGN KEY (reviewed_by)
    REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE;
