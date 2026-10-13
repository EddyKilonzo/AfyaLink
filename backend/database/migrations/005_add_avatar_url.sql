-- AfyaLink migration 005 (PostgreSQL 15+)
-- Add avatar_url column to users table for profile pictures

-- ---------------------------------------------------------------------------
-- users: add avatar_url for Cloudinary-hosted profile pictures
-- ---------------------------------------------------------------------------

ALTER TABLE users
ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);

-- Statistics update to help planner
ANALYZE users;