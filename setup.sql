-- ============================================
-- RADAR COCKPIT — Tables internes (privé)
-- À exécuter dans le SQL Editor de Supabase
-- ============================================

-- 1. TASKS — Kanban par sprint et builder
create table cockpit_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  sprint int2 not null check (sprint between 1 and 4),
  builder text not null check (builder in ('A','B','C')),
  status text not null default 'todo'
    check (status in ('todo','in_progress','done','blocked')),
  priority text default 'medium'
    check (priority in ('low','medium','high','critical')),
  task_ref text, -- réf vers la fiche hackathon (A1, B3, C7...)
  pr_url text,   -- lien vers la PR sur radar-foundation
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. DECISIONS — Débats async entre builders
create table cockpit_decisions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  context text,
  status text default 'open'
    check (status in ('open','decided','revisit')),
  decision text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- 3. COMMENTS — Réponses + votes sur les décisions
create table cockpit_comments (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid references cockpit_decisions(id) on delete cascade,
  body text not null,
  vote text check (vote in ('agree','disagree','neutral')),
  author_id uuid references auth.users(id),
  created_at timestamptz default now()
);

-- 4. RETRO — Points de rétrospective par sprint
create table cockpit_retro (
  id uuid primary key default gen_random_uuid(),
  sprint int2 not null check (sprint between 1 and 4),
  category text not null check (category in ('keep','stop','try')),
  body text not null,
  author_id uuid references auth.users(id),
  created_at timestamptz default now()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table cockpit_tasks enable row level security;
alter table cockpit_decisions enable row level security;
alter table cockpit_comments enable row level security;
alter table cockpit_retro enable row level security;

-- Politique : les 3 builders voient et éditent tout
-- (pas de restriction inter-builder, c'est une équipe)
create policy "builders_all" on cockpit_tasks
  for all using (auth.uid() is not null);

create policy "builders_all" on cockpit_decisions
  for all using (auth.uid() is not null);

create policy "builders_all" on cockpit_comments
  for all using (auth.uid() is not null);

create policy "builders_all" on cockpit_retro
  for all using (auth.uid() is not null);

-- ============================================
-- REALTIME — Activer pour toutes les tables
-- ============================================

alter publication supabase_realtime add table cockpit_tasks;
alter publication supabase_realtime add table cockpit_decisions;
alter publication supabase_realtime add table cockpit_comments;
alter publication supabase_realtime add table cockpit_retro;

-- ============================================
-- INDEX pour performance
-- ============================================

create index idx_tasks_sprint on cockpit_tasks(sprint);
create index idx_tasks_builder on cockpit_tasks(builder);
create index idx_tasks_status on cockpit_tasks(status);
create index idx_comments_decision on cockpit_comments(decision_id);
create index idx_retro_sprint on cockpit_retro(sprint);
-- ============================================
-- RADAR COCKPIT — KPIs + Resources
-- ============================================

-- 1. KPIs — Suivi des métriques Demo Day
CREATE TABLE IF NOT EXISTS cockpit_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  sprint int2 NOT NULL CHECK (sprint BETWEEN 1 AND 4),
  waitlist_signups int DEFAULT 0,
  users_registered int DEFAULT 0,
  users_active_7d int DEFAULT 0,
  cvs_generated int DEFAULT 0,
  alerts_sent int DEFAULT 0,
  users_pro int DEFAULT 0,
  mrr_eur numeric(10,2) DEFAULT 0,
  platforms_live int DEFAULT 0,
  avg_alert_time_sec int,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- 2. RESOURCES — Liens, refs, docs partagés
CREATE TABLE IF NOT EXISTS cockpit_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  url text,
  category text NOT NULL CHECK (category IN (
    'drive', 'design', 'reference', 'competitor', 'tool',
    'api_doc', 'tutorial', 'inspiration', 'admin', 'other'
  )),
  description text,
  tags text[], -- ex: ['claude', 'cv', 'stripe']
  pinned boolean DEFAULT false,
  shared_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- 3. VISION NOTES — Échanges sur la vision produit
CREATE TABLE IF NOT EXISTS cockpit_vision (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic text NOT NULL CHECK (topic IN (
    'product', 'market', 'tech', 'pitch', 'monetization', 'growth', 'other'
  )),
  title text NOT NULL,
  body text NOT NULL,
  builder text CHECK (builder IN ('A','B','C')),
  pinned boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE cockpit_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE cockpit_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE cockpit_vision ENABLE ROW LEVEL SECURITY;

CREATE POLICY "builders_all" ON cockpit_kpis FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "builders_all" ON cockpit_resources FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "builders_all" ON cockpit_vision FOR ALL USING (auth.uid() IS NOT NULL);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE cockpit_kpis;
ALTER PUBLICATION supabase_realtime ADD TABLE cockpit_resources;
ALTER PUBLICATION supabase_realtime ADD TABLE cockpit_vision;

-- Index
CREATE INDEX IF NOT EXISTS idx_kpis_date ON cockpit_kpis(date);
CREATE INDEX IF NOT EXISTS idx_resources_category ON cockpit_resources(category);
CREATE INDEX IF NOT EXISTS idx_resources_pinned ON cockpit_resources(pinned);
CREATE INDEX IF NOT EXISTS idx_vision_topic ON cockpit_vision(topic);
CREATE INDEX IF NOT EXISTS idx_vision_pinned ON cockpit_vision(pinned);
-- ============================================
-- COCKPIT MEMBERS — Dynamic team management
-- Replaces hardcoded ALLOWED_EMAILS whitelist
-- ============================================

CREATE TABLE IF NOT EXISTS cockpit_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text,
  role text NOT NULL DEFAULT 'member'
    CHECK (role IN ('admin', 'member', 'viewer')),
  builder text CHECK (builder IN ('A','B','C','D','E','F','G','H','I','J')),
  color text DEFAULT '#3b82f6',
  status text NOT NULL DEFAULT 'invited'
    CHECK (status IN ('invited', 'active', 'revoked')),
  invited_by uuid REFERENCES auth.users(id),
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  last_seen_at timestamptz
);

-- RLS: anyone authenticated can read members, only admins can write
ALTER TABLE cockpit_members ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read the member list
CREATE POLICY "members_read" ON cockpit_members
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only admins can insert/update/delete
CREATE POLICY "members_admin_write" ON cockpit_members
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM cockpit_members WHERE user_id = auth.uid() AND role = 'admin')
    OR NOT EXISTS (SELECT 1 FROM cockpit_members) -- First user can self-register
  );

CREATE POLICY "members_admin_update" ON cockpit_members
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM cockpit_members WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "members_admin_delete" ON cockpit_members
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM cockpit_members WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE cockpit_members;

-- Index
CREATE INDEX IF NOT EXISTS idx_members_email ON cockpit_members(email);
CREATE INDEX IF NOT EXISTS idx_members_status ON cockpit_members(status);

-- Seed the 3 current builders as active members
-- (Alex is admin since he owns the Supabase/Vercel accounts)
INSERT INTO cockpit_members (email, name, role, builder, color, status) VALUES
ON CONFLICT (email) DO NOTHING;
-- ============================================
-- MEMBER PROFILES — Editable fields per person
-- ============================================

ALTER TABLE cockpit_members ADD COLUMN IF NOT EXISTS linkedin text;
ALTER TABLE cockpit_members ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE cockpit_members ADD COLUMN IF NOT EXISTS timezone text;
ALTER TABLE cockpit_members ADD COLUMN IF NOT EXISTS languages text[];
ALTER TABLE cockpit_members ADD COLUMN IF NOT EXISTS availability text;
ALTER TABLE cockpit_members ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE cockpit_members ADD COLUMN IF NOT EXISTS skills text[];
ALTER TABLE cockpit_members ADD COLUMN IF NOT EXISTS urls jsonb DEFAULT '[]';
ALTER TABLE cockpit_members ADD COLUMN IF NOT EXISTS avatar_url text;

-- Allow members to update their own profile
CREATE POLICY "members_self_update" ON cockpit_members
  FOR UPDATE USING (user_id = auth.uid());
-- ============================================
-- ACTIVITY LOG — Track all actions
-- ============================================

CREATE TABLE IF NOT EXISTS cockpit_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  entity_title text,
  actor_email text,
  actor_name text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cockpit_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_read" ON cockpit_activity
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "activity_write" ON cockpit_activity
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

ALTER PUBLICATION supabase_realtime ADD TABLE cockpit_activity;

CREATE INDEX IF NOT EXISTS idx_activity_created ON cockpit_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_entity ON cockpit_activity(entity_type);

-- ============================================
-- BOT CONFIG — Store Telegram bot token + chat ID
-- ============================================

CREATE TABLE IF NOT EXISTS cockpit_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE cockpit_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "config_read" ON cockpit_config
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "config_write" ON cockpit_config
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "config_update" ON cockpit_config
  FOR UPDATE USING (auth.uid() IS NOT NULL);

ALTER PUBLICATION supabase_realtime ADD TABLE cockpit_config;
-- ============================================
-- API KEYS VAULT — Secure key storage per member
-- Keys are write-only: once stored, the full value is never returned
-- Only a masked version (last 4 chars) is visible
-- ============================================

CREATE TABLE IF NOT EXISTS cockpit_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  label text,
  key_hash text NOT NULL,
  key_masked text NOT NULL,
  key_encrypted text NOT NULL,
  added_by uuid REFERENCES auth.users(id),
  added_by_email text,
  added_by_name text,
  is_active boolean DEFAULT true,
  scope text DEFAULT 'project' CHECK (scope IN ('project', 'personal')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cockpit_api_keys ENABLE ROW LEVEL SECURITY;

-- Everyone can see key metadata (provider, who added, masked value)
CREATE POLICY "keys_read" ON cockpit_api_keys
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Anyone can add keys
CREATE POLICY "keys_insert" ON cockpit_api_keys
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Only the person who added can update/delete their key
CREATE POLICY "keys_update" ON cockpit_api_keys
  FOR UPDATE USING (added_by = auth.uid());

CREATE POLICY "keys_delete" ON cockpit_api_keys
  FOR DELETE USING (added_by = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE cockpit_api_keys;
-- Storage policies for project-files bucket
-- Allow authenticated users to upload, read, and delete files

CREATE POLICY "auth_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'project-files' AND auth.uid() IS NOT NULL
  );

CREATE POLICY "auth_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'project-files' AND auth.uid() IS NOT NULL
  );

CREATE POLICY "auth_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'project-files' AND auth.uid() IS NOT NULL
  );

-- Also add telegram_chat_id and expires_at columns
ALTER TABLE cockpit_members ADD COLUMN IF NOT EXISTS telegram_chat_id text;
ALTER TABLE cockpit_api_keys ADD COLUMN IF NOT EXISTS expires_at timestamptz;
-- ============================================
-- FILE METADATA — Context for every uploaded file
-- ============================================

CREATE TABLE IF NOT EXISTS cockpit_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  storage_path text NOT NULL,
  pillar text NOT NULL DEFAULT 'general'
    CHECK (pillar IN ('general','why','team','project','market','finance','config')),
  title text,
  description text,
  purpose text,
  status text DEFAULT 'draft'
    CHECK (status IN ('draft','review','approved','archived','outdated')),
  mime_type text,
  file_size bigint,
  tags text[],
  uploaded_by uuid REFERENCES auth.users(id),
  uploaded_by_name text,
  uploaded_by_email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE cockpit_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "files_read" ON cockpit_files
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "files_write" ON cockpit_files
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "files_update" ON cockpit_files
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "files_delete" ON cockpit_files
  FOR DELETE USING (auth.uid() IS NOT NULL);

ALTER PUBLICATION supabase_realtime ADD TABLE cockpit_files;
CREATE INDEX IF NOT EXISTS idx_files_pillar ON cockpit_files(pillar);
CREATE INDEX IF NOT EXISTS idx_files_status ON cockpit_files(status);
-- ============================================
-- CHECKLIST ITEMS — Every expected deliverable per pillar
-- Each item = a question, document, or action that must be completed
-- ============================================

CREATE TABLE IF NOT EXISTS cockpit_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pillar text NOT NULL CHECK (pillar IN ('why','team','resources','project','market','finances','analytics')),
  category text NOT NULL DEFAULT 'document',
  title text NOT NULL,
  description text,
  format text,
  required boolean DEFAULT true,
  status text DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done','validated','skipped')),
  validated_by uuid REFERENCES auth.users(id),
  validated_by_name text,
  assigned_to text,
  evidence_url text,
  notes text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE cockpit_checklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "checklist_read" ON cockpit_checklist FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "checklist_write" ON cockpit_checklist FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "checklist_update" ON cockpit_checklist FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "checklist_delete" ON cockpit_checklist FOR DELETE USING (auth.uid() IS NOT NULL);
ALTER PUBLICATION supabase_realtime ADD TABLE cockpit_checklist;
CREATE INDEX IF NOT EXISTS idx_checklist_pillar ON cockpit_checklist(pillar);
CREATE INDEX IF NOT EXISTS idx_checklist_status ON cockpit_checklist(status);

-- ============================================
-- SEED: All expected items from StartupKit.md
-- ============================================

-- WHY (6 questions + 4 documents = 10 items)
INSERT INTO cockpit_checklist (pillar, category, title, description, format, required, sort_order) VALUES
('why', 'question', 'Mission statement', 'What is the mission in one sentence?', 'Short text (1 line)', true, 1),
('why', 'question', 'Problem statement', 'What problem are we solving? With concrete examples.', 'Paragraph + examples', true, 2),
('why', 'question', 'Why us?', 'What is our competitive advantage? 3-5 key points.', 'Bullet list', true, 3),
('why', 'question', 'Vision 5-10 years', 'Where is the company going long-term?', '3 paragraphs', true, 4),
('why', 'question', 'Core values', 'What are the 5-10 fundamental values?', 'List', true, 5),
('why', 'question', 'North Star Metric', 'What single metric defines success?', 'Metric + explanation', true, 6),
('why', 'document', 'mission.md', 'Written mission statement document', 'Markdown file', true, 7),
('why', 'document', 'vision.md', 'Vision document with long-term direction', 'Markdown file', true, 8),
('why', 'document', 'values.md', 'List of core values', 'Markdown file', true, 9),
('why', 'document', 'problem_statement.md', 'Problem statement with client examples', 'Markdown file', true, 10),
('why', 'document', 'competitive_analysis', 'Benchmark of competitors', 'PDF or MD', false, 11),
('why', 'document', 'brand_guidelines.md', 'Brand tone, voice, visual identity', 'Markdown file', false, 12);

-- TEAM (5 questions + 5 documents + profiles)
INSERT INTO cockpit_checklist (pillar, category, title, description, format, required, sort_order) VALUES
('team', 'question', 'Key team members identified', 'Who are the members? Name, role, skills.', 'Table', true, 1),
('team', 'question', 'Missing roles identified', 'What roles are still needed? Priority list.', 'Priority list', true, 2),
('team', 'question', 'Decision-making process', 'How do we make decisions? (consensus, vote, lead decides)', 'Process description', true, 3),
('team', 'question', 'Collaboration rules', 'Working hours, communication norms, meeting rules', 'List of rules', true, 4),
('team', 'question', 'Conflict resolution', 'How do we handle disagreements?', '3-step process', true, 5),
('team', 'action', 'All profiles completed', 'Every member has filled their profile (bio, phone, LinkedIn, skills)', 'Profile page', true, 6),
('team', 'action', 'All members logged in', 'Every invited member has actually logged in', 'Auth check', true, 7),
('team', 'document', 'team.md', 'Team roster with roles and responsibilities', 'Markdown', true, 8),
('team', 'document', 'hiring_plan.md', 'Roles needed and hiring priorities', 'Markdown', true, 9),
('team', 'document', 'collaboration_rules.md', 'Rules of engagement for the team', 'Markdown', true, 10),
('team', 'document', 'org_chart', 'Visual organization chart', 'PDF or image', false, 11),
('team', 'document', 'onboarding_checklist.md', 'Steps for new team members', 'Markdown', false, 12);

-- RESOURCES (5 questions + 3 documents)
INSERT INTO cockpit_checklist (pillar, category, title, description, format, required, sort_order) VALUES
('resources', 'question', 'Tools inventory', 'What tools do we use? (name, link, cost, owner)', 'Table', true, 1),
('resources', 'question', 'Budget defined', 'What is the current budget breakdown?', 'Table with amounts', true, 2),
('resources', 'question', 'Security & passwords', 'Where are passwords stored? Who has access?', 'Link to vault', true, 3),
('resources', 'question', 'Key vendors identified', 'Who are our vendors? Contact info, contracts.', 'List', true, 4),
('resources', 'question', 'Hidden resources', 'Any credits, free tiers, contacts to leverage?', 'List', false, 5),
('resources', 'document', 'tools.md', 'Complete tools inventory', 'Markdown', true, 6),
('resources', 'document', 'budget.md', 'Budget breakdown document', 'Markdown', true, 7),
('resources', 'document', 'security.md', 'Security and access documentation', 'Markdown', true, 8),
('resources', 'action', '10+ resources added', 'At least 10 links, tools, or docs in the system', 'Dashboard check', true, 9),
('resources', 'action', 'Files uploaded', 'At least 1 file uploaded per pillar', 'Storage check', false, 10);

-- PROJECT (5 questions + 4 documents + actions)
INSERT INTO cockpit_checklist (pillar, category, title, description, format, required, sort_order) VALUES
('project', 'question', 'Roadmap defined', '6-month roadmap with milestones', 'Timeline', true, 1),
('project', 'question', 'Key deliverables listed', 'What are we delivering? With deadlines.', 'List + dates', true, 2),
('project', 'question', 'Prioritization method', 'How do we prioritize? RICE, MoSCoW, etc.', 'Method description', true, 3),
('project', 'question', 'Risks identified', 'What could go wrong? Impact and mitigation.', 'Risk table', true, 4),
('project', 'question', 'Delay management', 'What happens when we fall behind?', '3-step process', true, 5),
('project', 'document', 'roadmap.md', 'Written roadmap with timeline', 'Markdown', true, 6),
('project', 'document', 'deliverables.md', 'List of deliverables with deadlines', 'Markdown', true, 7),
('project', 'document', 'risk_register.md', 'Risk register with mitigation plans', 'Markdown', true, 8),
('project', 'action', '10+ tasks created', 'Board has at least 10 tasks', 'Board check', true, 9),
('project', 'action', 'Tasks assigned to all builders', 'Every team member has tasks', 'Board check', true, 10),
('project', 'action', 'Documentation imported', 'Project docs are in the system', 'Docs check', true, 11),
('project', 'action', 'First retrospective done', 'At least 1 retro completed', 'Retro check', true, 12);

-- MARKET (5 questions + 4 documents)
INSERT INTO cockpit_checklist (pillar, category, title, description, format, required, sort_order) VALUES
('market', 'question', 'Personas defined', 'Who are the 3-5 target user personas?', 'Detailed profiles', true, 1),
('market', 'question', 'Acquisition strategy', 'How do we get customers? Channels and costs.', 'Strategy doc', true, 2),
('market', 'question', 'Conversion funnel', 'What is our AARRR funnel?', 'Funnel diagram', true, 3),
('market', 'question', 'Feedback process', 'How do we collect and process user feedback?', 'Process description', true, 4),
('market', 'question', 'Direct competitors', 'Who are the competitors? Comparison table.', 'Comparison table', true, 5),
('market', 'document', 'personas/', 'Individual persona files (3-5)', 'Markdown files', true, 6),
('market', 'document', 'acquisition_strategy.md', 'Customer acquisition plan', 'Markdown', true, 7),
('market', 'document', 'feedback_process.md', 'How feedback is collected', 'Markdown', true, 8),
('market', 'document', 'market_size.md', 'TAM, SAM, SOM analysis', 'Markdown', false, 9),
('market', 'action', '3+ competitors listed', 'At least 3 competitors documented', 'Resources check', true, 10);

-- FINANCES (5 questions + 4 documents)
INSERT INTO cockpit_checklist (pillar, category, title, description, format, required, sort_order) VALUES
('finances', 'question', 'Burn rate calculated', 'Monthly burn rate with runway duration', 'Number + months', true, 1),
('finances', 'question', 'Revenue streams defined', 'Current and future revenue sources', 'Table', true, 2),
('finances', 'question', 'Business model chosen', 'Freemium, subscription, marketplace, etc.', 'Model description', true, 3),
('finances', 'question', 'Investors identified', 'Potential investors, amounts, terms', 'List', false, 4),
('finances', 'question', 'Accounting setup', 'How is accounting handled? Tools, frequency.', 'Process', false, 5),
('finances', 'document', 'burn_rate.md', 'Burn rate calculation document', 'Markdown', true, 6),
('finances', 'document', 'revenue_streams.md', 'Revenue streams breakdown', 'Markdown', true, 7),
('finances', 'document', 'business_model.md', 'Business model description', 'Markdown', true, 8),
('finances', 'document', 'pitch_deck', 'Investor pitch deck', 'PDF', false, 9),
('finances', 'document', 'cap_table.md', 'Cap table / equity split', 'Markdown', false, 10);

-- ANALYTICS (5 questions + 3 documents)
INSERT INTO cockpit_checklist (pillar, category, title, description, format, required, sort_order) VALUES
('analytics', 'question', 'KPIs defined', 'What are the 5-10 key metrics?', 'List', true, 1),
('analytics', 'question', 'Tracking tools chosen', 'Which tools track KPIs? (Analytics, Mixpanel, etc.)', 'List with links', true, 2),
('analytics', 'question', 'Alert thresholds set', 'What triggers an alert? KPI + threshold + action.', 'Table', true, 3),
('analytics', 'question', 'Insights sharing process', 'How and when are insights shared with the team?', 'Process', true, 4),
('analytics', 'question', 'Central dashboard exists', 'Is there a live dashboard everyone can see?', 'Link to dashboard', true, 5),
('analytics', 'document', 'kpis.md', 'KPI definitions and targets', 'Markdown', true, 6),
('analytics', 'document', 'alerts.md', 'Alert rules and thresholds', 'Markdown', true, 7),
('analytics', 'document', 'dashboard.md', 'Dashboard link and screenshot', 'Markdown', true, 8),
('analytics', 'action', 'First KPI entry logged', 'At least 1 KPI snapshot in the system', 'KPIs check', true, 9),
('analytics', 'action', '3+ KPI entries', 'Regular KPI tracking (3+ entries)', 'KPIs check', true, 10);-- ============================================
-- COLLABORATIVE RESPONSES — Everyone answers, consensus emerges
-- Each checklist item can have multiple responses from different people
-- ============================================

CREATE TABLE IF NOT EXISTS cockpit_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES cockpit_checklist(id) ON DELETE CASCADE,
  body text NOT NULL,
  author_id uuid REFERENCES auth.users(id),
  author_name text,
  author_role text,
  votes_up int DEFAULT 0,
  votes_down int DEFAULT 0,
  is_accepted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE cockpit_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "responses_read" ON cockpit_responses FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "responses_write" ON cockpit_responses FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "responses_update" ON cockpit_responses FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "responses_delete" ON cockpit_responses FOR DELETE USING (author_id = auth.uid());
ALTER PUBLICATION supabase_realtime ADD TABLE cockpit_responses;
CREATE INDEX IF NOT EXISTS idx_responses_checklist ON cockpit_responses(checklist_id);

-- ============================================
-- UPDATE ROLES — Expand from 3 to 7 roles
-- ============================================

ALTER TABLE cockpit_members DROP CONSTRAINT IF EXISTS cockpit_members_role_check;
ALTER TABLE cockpit_members ADD CONSTRAINT cockpit_members_role_check
  CHECK (role IN ('admin', 'cofounder', 'mentor', 'contributor', 'ambassador', 'prospect', 'fan', 'member', 'viewer'));

-- Upgrade existing admins to cofounders
UPDATE cockpit_members SET role = 'cofounder' WHERE role = 'admin';
-- Keep one as admin too (Alex)
-- ============================================
-- FEEDBACK — Suggestions, bugs, feature requests
-- ============================================

CREATE TABLE IF NOT EXISTS cockpit_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('improvement', 'bug', 'feature', 'question')),
  title text NOT NULL,
  body text,
  status text DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'planned', 'deployed', 'rejected')),
  votes int DEFAULT 0,
  author_id uuid REFERENCES auth.users(id),
  author_name text,
  reviewed_by text,
  review_note text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cockpit_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feedback_read" ON cockpit_feedback FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "feedback_write" ON cockpit_feedback FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "feedback_update" ON cockpit_feedback FOR UPDATE USING (auth.uid() IS NOT NULL);
ALTER PUBLICATION supabase_realtime ADD TABLE cockpit_feedback;
-- ============================================
-- VOTES — One vote per person per item
-- Tracks who voted on what, prevents duplicates
-- ============================================

CREATE TABLE IF NOT EXISTS cockpit_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  direction text NOT NULL CHECK (direction IN ('up', 'down')),
  voter_id uuid NOT NULL REFERENCES auth.users(id),
  voter_name text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(entity_type, entity_id, voter_id)
);

ALTER TABLE cockpit_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "votes_read" ON cockpit_votes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "votes_write" ON cockpit_votes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "votes_delete" ON cockpit_votes FOR DELETE USING (voter_id = auth.uid());
ALTER PUBLICATION supabase_realtime ADD TABLE cockpit_votes;
CREATE INDEX IF NOT EXISTS idx_votes_entity ON cockpit_votes(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter ON cockpit_votes(voter_id);
-- Migration 013: Simplify roles to 4 levels
-- Decision from 7 April 2026: admin, cofounder, mentor, observer
-- Old roles mapped: contributor→cofounder, ambassador/prospect/fan/member/viewer→observer

-- First: promote the 3 core builders to cofounder
UPDATE cockpit_members SET role = 'cofounder'
  AND role != 'admin';

-- Map remaining old roles
UPDATE cockpit_members SET role = 'cofounder' WHERE role = 'contributor';
UPDATE cockpit_members SET role = 'observer' WHERE role IN ('ambassador', 'prospect', 'fan', 'member', 'viewer');

-- Update the constraint to only allow 4 roles
ALTER TABLE cockpit_members DROP CONSTRAINT IF EXISTS cockpit_members_role_check;
ALTER TABLE cockpit_members ADD CONSTRAINT cockpit_members_role_check
  CHECK (role IN ('admin', 'cofounder', 'mentor', 'observer'));
-- Migration 014: Reset all checklist items to 'todo'
-- Reason: All existing status changes were from testing/seed, not real work.
-- The team starts fresh from here.

UPDATE cockpit_checklist SET status = 'todo', validated_by = NULL, validated_by_name = NULL
WHERE status != 'todo';
-- Migration 015: Make cockpit_comments generic (not just for decisions)
-- Adds entity_type + entity_id so comments can be attached to objectives, vision, etc.

ALTER TABLE cockpit_comments ADD COLUMN IF NOT EXISTS entity_type text;
ALTER TABLE cockpit_comments ADD COLUMN IF NOT EXISTS entity_id uuid;
CREATE INDEX IF NOT EXISTS idx_comments_entity ON cockpit_comments(entity_type, entity_id);
-- Migration 016: Remove Athena from cockpit_members
-- Athena is not a person, it's an agent concept. Not a member.
DELETE FROM cockpit_members WHERE email = 'athena@project-os.ai';
-- Migration 017: Expand cockpit_vision topic constraint
-- Add 'roadmap' and 'discovery' as valid topics
-- Also remove the builder constraint (now supports A-J from cockpit_members)

ALTER TABLE cockpit_vision DROP CONSTRAINT IF EXISTS cockpit_vision_topic_check;
ALTER TABLE cockpit_vision ADD CONSTRAINT cockpit_vision_topic_check
  CHECK (topic IN ('product', 'market', 'tech', 'pitch', 'monetization', 'growth', 'other', 'roadmap', 'discovery'));

ALTER TABLE cockpit_vision DROP CONSTRAINT IF EXISTS cockpit_vision_builder_check;
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
-- ============================================
-- SEED: Startup Checklist Template (70 items, 7 pillars)
-- Run this AFTER all migrations to populate the checklist.
-- This is TEMPLATE data — universal for any startup.
-- Delete and re-run to reset.
-- ============================================

DELETE FROM cockpit_checklist;

-- WHY (6 questions + 6 documents)
INSERT INTO cockpit_checklist (pillar, category, title, description, format, required, sort_order) VALUES
('why', 'question', 'Mission statement', 'What is the mission in one sentence?', 'Short text (1 line)', true, 1),
('why', 'question', 'Problem statement', 'What problem are we solving? With concrete examples.', 'Paragraph + examples', true, 2),
('why', 'question', 'Why us?', 'What is our competitive advantage? 3-5 key points.', 'Bullet list', true, 3),
('why', 'question', 'Vision 5-10 years', 'Where is the company going long-term?', '3 paragraphs', true, 4),
('why', 'question', 'Core values', 'What are the 5-10 fundamental values?', 'List', true, 5),
('why', 'question', 'North Star Metric', 'What single metric defines success?', 'Metric + explanation', true, 6),
('why', 'document', 'mission.md', 'Written mission statement document', 'Markdown file', true, 7),
('why', 'document', 'vision.md', 'Vision document with long-term direction', 'Markdown file', true, 8),
('why', 'document', 'values.md', 'List of core values', 'Markdown file', true, 9),
('why', 'document', 'problem_statement.md', 'Problem statement with client examples', 'Markdown file', true, 10),
('why', 'document', 'competitive_analysis', 'Benchmark of competitors', 'PDF or MD', false, 11),
('why', 'document', 'brand_guidelines.md', 'Brand tone, voice, visual identity', 'Markdown file', false, 12);

-- TEAM (5 questions + 2 actions + 5 documents)
INSERT INTO cockpit_checklist (pillar, category, title, description, format, required, sort_order) VALUES
('team', 'question', 'Key team members identified', 'Who are the members? Name, role, skills.', 'Table', true, 1),
('team', 'question', 'Missing roles identified', 'What roles are still needed? Priority list.', 'Priority list', true, 2),
('team', 'question', 'Decision-making process', 'How do we make decisions? (consensus, vote, lead decides)', 'Process description', true, 3),
('team', 'question', 'Collaboration rules', 'Working hours, communication norms, meeting rules', 'List of rules', true, 4),
('team', 'question', 'Conflict resolution', 'How do we handle disagreements?', '3-step process', true, 5),
('team', 'action', 'All profiles completed', 'Every member has filled their profile (bio, phone, LinkedIn, skills)', 'Profile page', true, 6),
('team', 'action', 'All members logged in', 'Every invited member has actually logged in', 'Auth check', true, 7),
('team', 'document', 'team.md', 'Team roster with roles and responsibilities', 'Markdown', true, 8),
('team', 'document', 'hiring_plan.md', 'Roles needed and hiring priorities', 'Markdown', true, 9),
('team', 'document', 'collaboration_rules.md', 'Rules of engagement for the team', 'Markdown', true, 10),
('team', 'document', 'org_chart', 'Visual organization chart', 'PDF or image', false, 11),
('team', 'document', 'onboarding_checklist.md', 'Steps for new team members', 'Markdown', false, 12);

-- RESOURCES (5 questions + 3 documents + 2 actions)
INSERT INTO cockpit_checklist (pillar, category, title, description, format, required, sort_order) VALUES
('resources', 'question', 'Tools inventory', 'What tools do we use? (name, link, cost, owner)', 'Table', true, 1),
('resources', 'question', 'Budget defined', 'What is the current budget breakdown?', 'Table with amounts', true, 2),
('resources', 'question', 'Security & passwords', 'Where are passwords stored? Who has access?', 'Link to vault', true, 3),
('resources', 'question', 'Key vendors identified', 'Who are our vendors? Contact info, contracts.', 'List', true, 4),
('resources', 'question', 'Hidden resources', 'Any credits, free tiers, contacts to leverage?', 'List', false, 5),
('resources', 'document', 'tools.md', 'Complete tools inventory', 'Markdown', true, 6),
('resources', 'document', 'budget.md', 'Budget breakdown document', 'Markdown', true, 7),
('resources', 'document', 'security.md', 'Security and access documentation', 'Markdown', true, 8),
('resources', 'action', '10+ resources added', 'At least 10 links, tools, or docs in the system', 'Dashboard check', true, 9),
('resources', 'action', 'Files uploaded', 'At least 1 file uploaded per pillar', 'Storage check', false, 10);

-- PROJECT (5 questions + 3 documents + 4 actions)
INSERT INTO cockpit_checklist (pillar, category, title, description, format, required, sort_order) VALUES
('project', 'question', 'Roadmap defined', '6-month roadmap with milestones', 'Timeline', true, 1),
('project', 'question', 'Key deliverables listed', 'What are we delivering? With deadlines.', 'List + dates', true, 2),
('project', 'question', 'Prioritization method', 'How do we prioritize? RICE, MoSCoW, etc.', 'Method description', true, 3),
('project', 'question', 'Risks identified', 'What could go wrong? Impact and mitigation.', 'Risk table', true, 4),
('project', 'question', 'Delay management', 'What happens when we fall behind?', '3-step process', true, 5),
('project', 'document', 'roadmap.md', 'Written roadmap with timeline', 'Markdown', true, 6),
('project', 'document', 'deliverables.md', 'List of deliverables with deadlines', 'Markdown', true, 7),
('project', 'document', 'risk_register.md', 'Risk register with mitigation plans', 'Markdown', true, 8),
('project', 'action', '10+ tasks created', 'Board has at least 10 tasks', 'Board check', true, 9),
('project', 'action', 'Tasks assigned to all builders', 'Every team member has tasks', 'Board check', true, 10),
('project', 'action', 'Documentation imported', 'Project docs are in the system', 'Docs check', true, 11),
('project', 'action', 'First retrospective done', 'At least 1 retro completed', 'Retro check', true, 12);

-- MARKET (5 questions + 4 documents + 1 action)
INSERT INTO cockpit_checklist (pillar, category, title, description, format, required, sort_order) VALUES
('market', 'question', 'Personas defined', 'Who are the 3-5 target user personas?', 'Detailed profiles', true, 1),
('market', 'question', 'Acquisition strategy', 'How do we get customers? Channels and costs.', 'Strategy doc', true, 2),
('market', 'question', 'Conversion funnel', 'What is our AARRR funnel?', 'Funnel diagram', true, 3),
('market', 'question', 'Feedback process', 'How do we collect and process user feedback?', 'Process description', true, 4),
('market', 'question', 'Direct competitors', 'Who are the competitors? Comparison table.', 'Comparison table', true, 5),
('market', 'document', 'personas/', 'Individual persona files (3-5)', 'Markdown files', true, 6),
('market', 'document', 'acquisition_strategy.md', 'Customer acquisition plan', 'Markdown', true, 7),
('market', 'document', 'feedback_process.md', 'How feedback is collected', 'Markdown', true, 8),
('market', 'document', 'market_size.md', 'TAM, SAM, SOM analysis', 'Markdown', false, 9),
('market', 'action', '3+ competitors listed', 'At least 3 competitors documented', 'Resources check', true, 10);

-- FINANCES (5 questions + 5 documents)
INSERT INTO cockpit_checklist (pillar, category, title, description, format, required, sort_order) VALUES
('finances', 'question', 'Burn rate calculated', 'Monthly burn rate with runway duration', 'Number + months', true, 1),
('finances', 'question', 'Revenue streams defined', 'Current and future revenue sources', 'Table', true, 2),
('finances', 'question', 'Business model chosen', 'Freemium, subscription, marketplace, etc.', 'Model description', true, 3),
('finances', 'question', 'Investors identified', 'Potential investors, amounts, terms', 'List', false, 4),
('finances', 'question', 'Accounting setup', 'How is accounting handled? Tools, frequency.', 'Process', false, 5),
('finances', 'document', 'burn_rate.md', 'Burn rate calculation document', 'Markdown', true, 6),
('finances', 'document', 'revenue_streams.md', 'Revenue streams breakdown', 'Markdown', true, 7),
('finances', 'document', 'business_model.md', 'Business model description', 'Markdown', true, 8),
('finances', 'document', 'pitch_deck', 'Investor pitch deck', 'PDF', false, 9),
('finances', 'document', 'cap_table.md', 'Cap table / equity split', 'Markdown', false, 10);

-- ANALYTICS (5 questions + 3 documents + 2 actions)
INSERT INTO cockpit_checklist (pillar, category, title, description, format, required, sort_order) VALUES
('analytics', 'question', 'KPIs defined', 'What are the 5-10 key metrics?', 'List', true, 1),
('analytics', 'question', 'Tracking tools chosen', 'Which tools track KPIs? (Analytics, Mixpanel, etc.)', 'List with links', true, 2),
('analytics', 'question', 'Alert thresholds set', 'What triggers an alert? KPI + threshold + action.', 'Table', true, 3),
('analytics', 'question', 'Insights sharing process', 'How and when are insights shared with the team?', 'Process', true, 4),
('analytics', 'question', 'Central dashboard exists', 'Is there a live dashboard everyone can see?', 'Link to dashboard', true, 5),
('analytics', 'document', 'kpis.md', 'KPI definitions and targets', 'Markdown', true, 6),
('analytics', 'document', 'alerts.md', 'Alert rules and thresholds', 'Markdown', true, 7),
('analytics', 'document', 'dashboard.md', 'Dashboard link and screenshot', 'Markdown', true, 8),
('analytics', 'action', 'First KPI entry logged', 'At least 1 KPI snapshot in the system', 'KPIs check', true, 9),
('analytics', 'action', '3+ KPI entries', 'Regular KPI tracking (3+ entries)', 'KPIs check', true, 10);
-- ============================================
-- SEED: Default Workflow Template (11 steps)
-- Run this AFTER all migrations.
-- This creates the default feature development workflow.
-- The workflow is also hardcoded as fallback in workflow/page.js.
-- ============================================

-- Only insert if no workflow exists yet
INSERT INTO cockpit_vision (topic, title, body)
SELECT 'workflow', 'Feature Workflow', '{"steps":[
  {"id":"prep","name":"Preparation","description":"Gather context, define scope, identify stakeholders","min_role":"cofounder","can_be_agent":false,"order":1},
  {"id":"ref_int","name":"Internal Reference","description":"Check existing features, goals, and docs for overlap","min_role":"cofounder","can_be_agent":true,"order":2},
  {"id":"ref_ext","name":"External Research","description":"Benchmark competitors, find best practices","min_role":"mentor","can_be_agent":true,"order":3},
  {"id":"comm","name":"Communication","description":"Announce the feature to the team, share context","min_role":"cofounder","can_be_agent":false,"order":4},
  {"id":"debate","name":"Team Debate","description":"Discuss approach, collect opinions, resolve disagreements","min_role":"cofounder","can_be_agent":false,"order":5},
  {"id":"define","name":"Definition & Specs","description":"Write technical specs, define acceptance criteria","min_role":"cofounder","can_be_agent":true,"order":6},
  {"id":"config","name":"Configuration","description":"Set up environment, database, API keys","min_role":"cofounder","can_be_agent":true,"order":7},
  {"id":"build","name":"Build / Deploy","description":"Implement the feature, intermediate deployments","min_role":"cofounder","can_be_agent":true,"order":8},
  {"id":"test","name":"Test & QA","description":"Manual and automated testing, edge cases","min_role":"cofounder","can_be_agent":false,"order":9},
  {"id":"review","name":"Review & Control","description":"Code review, stakeholder validation","min_role":"mentor","can_be_agent":false,"order":10},
  {"id":"confirm","name":"Confirmation & Launch","description":"Final approval, production deploy, announce","min_role":"cofounder","can_be_agent":false,"order":11}
]}'
WHERE NOT EXISTS (SELECT 1 FROM cockpit_vision WHERE topic = 'workflow');
