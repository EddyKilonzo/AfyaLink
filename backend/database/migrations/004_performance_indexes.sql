-- AfyaLink migration 004 (PostgreSQL 15+)
-- Performance indexes for common query patterns

-- ---------------------------------------------------------------------------
-- health_reports: additional indexes for list, edit window, and map queries
-- ---------------------------------------------------------------------------

-- CHV edit window: WHERE chv_id = ? AND status = 'SUBMITTED' AND received_at >= ?
CREATE INDEX IF NOT EXISTS idx_reports_chv_status_received
  ON health_reports (chv_id, status, received_at DESC);

-- Admin review: WHERE reviewed_by = ?
CREATE INDEX IF NOT EXISTS idx_reports_reviewed_by
  ON health_reports (reviewed_by);

-- Admin list with multiple filters: chv_id, category, severity, status, location_id, observed_at range
-- This composite index supports the most common admin list query patterns
CREATE INDEX IF NOT EXISTS idx_reports_admin_list
  ON health_reports (chv_id, category, severity, status, location_id, observed_at DESC);

-- Map queries: COALESCE(r.latitude, l.latitude) IS NOT NULL AND COALESCE(r.longitude, l.longitude) IS NOT NULL
-- Partial index for reports with coordinates (most reports won't have them)
CREATE INDEX IF NOT EXISTS idx_reports_has_coords
  ON health_reports (observed_at DESC)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- For map queries joining location table for coordinates
CREATE INDEX IF NOT EXISTS idx_reports_location_observed
  ON health_reports (location_id, observed_at DESC);

-- ---------------------------------------------------------------------------
-- users: additional indexes for auth and location-based queries
-- ---------------------------------------------------------------------------

-- Location-based CHV queries
CREATE INDEX IF NOT EXISTS idx_users_location
  ON users (location_id);

-- Active user filtering (common in admin lists)
CREATE INDEX IF NOT EXISTS idx_users_active
  ON users (is_active);

-- Composite for session validation: is_active + tokens_valid_after
CREATE INDEX IF NOT EXISTS idx_users_session_valid
  ON users (is_active, tokens_valid_after);

-- ---------------------------------------------------------------------------
-- locations: indexes for geographic queries
-- ---------------------------------------------------------------------------

-- County-level filtering (very common in analytics)
CREATE INDEX IF NOT EXISTS idx_locations_county
  ON locations (county);

-- County + sub_county for drill-down
CREATE INDEX IF NOT EXISTS idx_locations_county_subcounty
  ON locations (county, sub_county);

-- Coordinates for map clustering
CREATE INDEX IF NOT EXISTS idx_locations_coords
  ON locations (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- ---------------------------------------------------------------------------
-- audit_logs: additional index for target lookup
-- (existing: created_at, actor_id+created_at, action+created_at, target_type+target_id)
-- ---------------------------------------------------------------------------

-- For querying audit logs by target entity (e.g., all actions on a specific report)
-- The existing idx_audit_target covers target_type + target_id, good enough.

-- ---------------------------------------------------------------------------
-- sync_logs: existing idx_sync_logs_user_started covers user + started_at
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- revoked_sessions: existing idx_revoked_expires covers expiry cleanup
-- ---------------------------------------------------------------------------

-- Statistics update to help planner
ANALYZE users;
ANALYZE health_reports;
ANALYZE locations;
ANALYZE audit_logs;
ANALYZE sync_logs;
ANALYZE revoked_sessions;