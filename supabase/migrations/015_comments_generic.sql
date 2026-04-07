-- Migration 015: Make cockpit_comments generic (not just for decisions)
-- Adds entity_type + entity_id so comments can be attached to objectives, vision, etc.

ALTER TABLE cockpit_comments ADD COLUMN IF NOT EXISTS entity_type text;
ALTER TABLE cockpit_comments ADD COLUMN IF NOT EXISTS entity_id uuid;
CREATE INDEX IF NOT EXISTS idx_comments_entity ON cockpit_comments(entity_type, entity_id);
