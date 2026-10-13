-- AfyaLink migration 002 (PostgreSQL 15+)
-- 1. users.tokens_valid_after: sessions issued before this instant are
--    rejected. Set on password change/reset, deactivation and role change, so
--    a leaked cookie dies with the old password and reactivating an account
--    does not bring its old sessions back.
-- 2. health_reports review fields: an ADMIN moves a report
--    SUBMITTED -> REVIEWED -> ACTIONED and the reviewer and time are recorded.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS tokens_valid_after TIMESTAMPTZ(6) NULL;

ALTER TABLE health_reports
  ADD COLUMN IF NOT EXISTS reviewed_by  UUID NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at  TIMESTAMPTZ(6) NULL,
  ADD COLUMN IF NOT EXISTS review_note  VARCHAR(500) NULL;

CREATE INDEX IF NOT EXISTS idx_reports_status_observed ON health_reports (status, observed_at);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_reports_reviewer'
  ) THEN
    ALTER TABLE health_reports
      ADD CONSTRAINT fk_reports_reviewer FOREIGN KEY (reviewed_by)
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;