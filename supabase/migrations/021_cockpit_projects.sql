-- Migration 021: cockpit_projects table + link features to projects

CREATE TABLE IF NOT EXISTS cockpit_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  why TEXT,
  how TEXT,
  what TEXT,
  responsible TEXT,
  controller TEXT,
  status TEXT NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed', 'approved', 'locked', 'active', 'completed', 'archived')),
  priority TEXT DEFAULT 'moyenne'
    CHECK (priority IN ('critique', 'haute', 'moyenne', 'basse')),
  proposed_by TEXT,
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cockpit_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cockpit_projects_read" ON cockpit_projects FOR SELECT USING (true);
CREATE POLICY "cockpit_projects_write" ON cockpit_projects FOR ALL USING (true) WITH CHECK (true);

-- Link features to projects
ALTER TABLE cockpit_features_os ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES cockpit_projects(id);
