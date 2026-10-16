-- 006: index the queries the app actually runs most.
--
-- idx_reports_admin_list (chv_id, category, severity, status, location_id,
-- observed_at) only helps when its leading columns are filtered, so it served
-- neither the admin's unfiltered "newest first" list nor the admin analytics
-- window (observed_at >= since), while slowing every insert. Single-filter
-- cases are already covered by the (column, observed_at) indexes from 001-004.
DROP INDEX IF EXISTS idx_reports_admin_list;

-- Newest-first list (ORDER BY observed_at DESC, id DESC) and date-window
-- aggregates across all CHVs. `id` makes the pagination order stable.
CREATE INDEX IF NOT EXISTS idx_reports_observed_id
  ON health_reports (observed_at DESC, id DESC);

-- Case-insensitive user search (LOWER(full_name) / LOWER(email) LIKE ...)
-- is a leading-wildcard match, which no b-tree can serve; the users table is
-- small, so a sequential scan is fine there.

ANALYZE health_reports;
