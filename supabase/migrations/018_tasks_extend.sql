-- Migration 018: Extend cockpit_tasks for feature-linked workflow tasks
-- Adds: feature link, imbrication (parent/child), output, assigned_to, workflow step, deadline

ALTER TABLE cockpit_tasks ADD COLUMN IF NOT EXISTS feature_id uuid;
ALTER TABLE cockpit_tasks ADD COLUMN IF NOT EXISTS parent_id uuid;
ALTER TABLE cockpit_tasks ADD COLUMN IF NOT EXISTS output text;
ALTER TABLE cockpit_tasks ADD COLUMN IF NOT EXISTS assigned_to text;
ALTER TABLE cockpit_tasks ADD COLUMN IF NOT EXISTS min_role text DEFAULT 'cofounder';
ALTER TABLE cockpit_tasks ADD COLUMN IF NOT EXISTS can_be_agent boolean DEFAULT false;
ALTER TABLE cockpit_tasks ADD COLUMN IF NOT EXISTS workflow_step text;
ALTER TABLE cockpit_tasks ADD COLUMN IF NOT EXISTS deadline timestamptz;
ALTER TABLE cockpit_tasks ADD COLUMN IF NOT EXISTS sort_order int DEFAULT 0;

-- Relax builder constraint (now supports dynamic members, not just A/B/C)
ALTER TABLE cockpit_tasks DROP CONSTRAINT IF EXISTS cockpit_tasks_builder_check;

-- Add workflow topic to vision constraint
ALTER TABLE cockpit_vision DROP CONSTRAINT IF EXISTS cockpit_vision_topic_check;
ALTER TABLE cockpit_vision ADD CONSTRAINT cockpit_vision_topic_check
  CHECK (topic IN ('product','market','tech','pitch','monetization','growth','other','roadmap','discovery','workflow'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_feature ON cockpit_tasks(feature_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON cockpit_tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON cockpit_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_workflow ON cockpit_tasks(workflow_step);
