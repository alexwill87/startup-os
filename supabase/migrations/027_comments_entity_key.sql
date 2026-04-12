-- Migration 027: Add entity_key to cockpit_comments
-- Allows linking comments to non-UUID entities (e.g. vision horizons by slug)

ALTER TABLE cockpit_comments ADD COLUMN IF NOT EXISTS entity_key TEXT;
CREATE INDEX IF NOT EXISTS idx_comments_entity_key ON cockpit_comments(entity_type, entity_key);
