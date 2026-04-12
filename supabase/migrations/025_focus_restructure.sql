-- Migration 025: Focus restructure — stages, work_kind, sprints, problems, chat

ALTER TABLE cockpit_features_os ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'feature';
ALTER TABLE cockpit_features_os ADD CONSTRAINT cockpit_features_os_stage_check CHECK (stage IN ('idea', 'feature'));

ALTER TABLE cockpit_features_os ADD COLUMN IF NOT EXISTS work_kind TEXT DEFAULT 'feature';
ALTER TABLE cockpit_features_os ADD CONSTRAINT cockpit_features_os_work_kind_check CHECK (work_kind IN ('feature', 'mission'));

ALTER TABLE cockpit_features_os ADD COLUMN IF NOT EXISTS supports_feature_id UUID REFERENCES cockpit_features_os(id);

CREATE TABLE IF NOT EXISTS cockpit_problems (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'linked', 'solved')),
  proposed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE cockpit_problems ENABLE ROW LEVEL SECURITY;
CREATE POLICY "problems_read" ON cockpit_problems FOR SELECT USING (true);
CREATE POLICY "problems_write" ON cockpit_problems FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS cockpit_sprints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved', 'active', 'completed', 'cancelled')),
  proposed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE cockpit_sprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sprints_read" ON cockpit_sprints FOR SELECT USING (true);
CREATE POLICY "sprints_write" ON cockpit_sprints FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE cockpit_features_os ADD COLUMN IF NOT EXISTS sprint_id UUID REFERENCES cockpit_sprints(id);

CREATE TABLE IF NOT EXISTS cockpit_chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES cockpit_projects(id) ON DELETE CASCADE,
  author_id UUID,
  author_name TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE cockpit_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_read" ON cockpit_chat_messages FOR SELECT USING (true);
CREATE POLICY "chat_write" ON cockpit_chat_messages FOR ALL USING (true) WITH CHECK (true);
