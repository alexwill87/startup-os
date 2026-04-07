-- Migration 017: Expand cockpit_vision topic constraint
-- Add 'roadmap' and 'discovery' as valid topics
-- Also remove the builder constraint (now supports A-J from cockpit_members)

ALTER TABLE cockpit_vision DROP CONSTRAINT IF EXISTS cockpit_vision_topic_check;
ALTER TABLE cockpit_vision ADD CONSTRAINT cockpit_vision_topic_check
  CHECK (topic IN ('product', 'market', 'tech', 'pitch', 'monetization', 'growth', 'other', 'roadmap', 'discovery'));

ALTER TABLE cockpit_vision DROP CONSTRAINT IF EXISTS cockpit_vision_builder_check;
