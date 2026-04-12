-- ============================================
-- STARTUP OS — Self-hosted PostgreSQL setup
-- Generated from migrations 001-027
-- Stripped of: auth.*, RLS, realtime, storage
-- ============================================

-- 1. TASKS
CREATE TABLE IF NOT EXISTS cockpit_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  sprint INT2 NOT NULL CHECK (sprint BETWEEN 1 AND 4),
  builder TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo','in_progress','done','blocked')),
  priority TEXT DEFAULT 'medium'
    CHECK (priority IN ('low','medium','high','critical')),
  task_ref TEXT,
  pr_url TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  -- from 018
  feature_id UUID,
  parent_id UUID,
  output TEXT,
  assigned_to TEXT,
  workflow_step TEXT DEFAULT 'todo' CHECK (workflow_step IN ('todo','in_progress','review','done','blocked')),
  deadline TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_tasks_sprint ON cockpit_tasks(sprint);
CREATE INDEX IF NOT EXISTS idx_tasks_builder ON cockpit_tasks(builder);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON cockpit_tasks(status);

-- 2. DECISIONS
CREATE TABLE IF NOT EXISTS cockpit_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  context TEXT,
  status TEXT DEFAULT 'open'
    CHECK (status IN ('open','decided','revisit')),
  decision TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. COMMENTS (generic, with entity_type/entity_id/entity_key)
CREATE TABLE IF NOT EXISTS cockpit_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID REFERENCES cockpit_decisions(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  vote TEXT CHECK (vote IN ('agree','disagree','neutral')),
  author_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  entity_type TEXT,
  entity_id UUID,
  entity_key TEXT
);
CREATE INDEX IF NOT EXISTS idx_comments_decision ON cockpit_comments(decision_id);
CREATE INDEX IF NOT EXISTS idx_comments_entity ON cockpit_comments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_comments_entity_key ON cockpit_comments(entity_type, entity_key);

-- 4. RETRO
CREATE TABLE IF NOT EXISTS cockpit_retro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint INT2 NOT NULL CHECK (sprint BETWEEN 1 AND 4),
  category TEXT NOT NULL CHECK (category IN ('keep','stop','try')),
  body TEXT NOT NULL,
  author_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_retro_sprint ON cockpit_retro(sprint);

-- 5. KPIs
CREATE TABLE IF NOT EXISTS cockpit_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  sprint INT2 NOT NULL CHECK (sprint BETWEEN 1 AND 4),
  waitlist_signups INT DEFAULT 0,
  users_registered INT DEFAULT 0,
  users_active_7d INT DEFAULT 0,
  cvs_generated INT DEFAULT 0,
  alerts_sent INT DEFAULT 0,
  users_pro INT DEFAULT 0,
  mrr_eur NUMERIC(10,2) DEFAULT 0,
  platforms_live INT DEFAULT 0,
  avg_alert_time_sec INT,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_kpis_date ON cockpit_kpis(date);

-- 6. RESOURCES
CREATE TABLE IF NOT EXISTS cockpit_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  url TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'drive','design','reference','competitor','tool',
    'api_doc','tutorial','inspiration','admin','other'
  )),
  description TEXT,
  tags TEXT[],
  pinned BOOLEAN DEFAULT false,
  shared_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_resources_category ON cockpit_resources(category);
CREATE INDEX IF NOT EXISTS idx_resources_pinned ON cockpit_resources(pinned);

-- 7. VISION
CREATE TABLE IF NOT EXISTS cockpit_vision (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  builder TEXT,
  pinned BOOLEAN DEFAULT false,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vision_topic ON cockpit_vision(topic);
CREATE INDEX IF NOT EXISTS idx_vision_pinned ON cockpit_vision(pinned);

-- 8. MEMBERS
CREATE TABLE IF NOT EXISTS cockpit_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'cofounder'
    CHECK (role IN ('admin','cofounder','mentor','observer')),
  builder TEXT,
  color TEXT DEFAULT '#3b82f6',
  status TEXT NOT NULL DEFAULT 'invited'
    CHECK (status IN ('invited','active','revoked')),
  invited_by TEXT,
  user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ,
  -- from 004
  linkedin TEXT,
  github TEXT,
  telegram TEXT,
  avatar_url TEXT,
  bio TEXT,
  timezone TEXT DEFAULT 'Europe/Paris',
  -- from 023
  telegram_chat_id TEXT,
  notif_enabled BOOLEAN DEFAULT TRUE,
  notif_quiet_start INTEGER DEFAULT 22,
  notif_quiet_end INTEGER DEFAULT 8
);
CREATE INDEX IF NOT EXISTS idx_members_email ON cockpit_members(email);
CREATE INDEX IF NOT EXISTS idx_members_status ON cockpit_members(status);

-- 9. ACTIVITY LOG
CREATE TABLE IF NOT EXISTS cockpit_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_email TEXT,
  actor_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  entity_title TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_created ON cockpit_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_actor ON cockpit_activity(actor_email);

-- 10. CONFIG
CREATE TABLE IF NOT EXISTS cockpit_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 11. API KEYS
CREATE TABLE IF NOT EXISTS cockpit_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_email TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('openai','anthropic','mistral','cohere','openrouter','other')),
  label TEXT,
  key_masked TEXT NOT NULL,
  key_encrypted TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_api_keys_member ON cockpit_api_keys(member_email);

-- 12. FILES
CREATE TABLE IF NOT EXISTS cockpit_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  category TEXT DEFAULT 'other' CHECK (category IN (
    'pitch_deck','financial','legal','design','technical','meeting_notes','research','other'
  )),
  description TEXT,
  tags TEXT[],
  uploaded_by TEXT,
  entity_type TEXT,
  entity_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_files_category ON cockpit_files(category);

-- 13. CHECKLIST
CREATE TABLE IF NOT EXISTS cockpit_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pillar TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  expected_output TEXT,
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
  sort_order INT DEFAULT 0,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done','skip')),
  validated_by TEXT,
  validated_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_checklist_pillar ON cockpit_checklist(pillar);

-- 14. FEEDBACK
CREATE TABLE IF NOT EXISTS cockpit_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_email TEXT,
  author_name TEXT,
  category TEXT DEFAULT 'suggestion' CHECK (category IN ('bug','suggestion','question','praise')),
  body TEXT NOT NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new','noted','planned','done','wontfix')),
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON cockpit_feedback(status);

-- 15. VOTES
CREATE TABLE IF NOT EXISTS cockpit_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  voter_email TEXT NOT NULL,
  vote TEXT NOT NULL CHECK (vote IN ('agree','disagree','neutral')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(entity_type, entity_id, voter_email)
);
CREATE INDEX IF NOT EXISTS idx_votes_entity ON cockpit_votes(entity_type, entity_id);

-- 16. FEATURES OS (meta-tracking cockpit features)
CREATE TABLE IF NOT EXISTS cockpit_features_os (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'reflexion'
    CHECK (status IN ('reflexion','defini','en_cours','fonctionnel','valide')),
  pillar TEXT,
  route TEXT,
  owner TEXT,
  validated_admin BOOLEAN DEFAULT FALSE,
  validated_cofounder BOOLEAN DEFAULT FALSE,
  validated_claude BOOLEAN DEFAULT FALSE,
  step_1_done BOOLEAN DEFAULT FALSE,
  step_2_done BOOLEAN DEFAULT FALSE,
  step_3_done BOOLEAN DEFAULT FALSE,
  step_4_done BOOLEAN DEFAULT FALSE,
  step_5_done BOOLEAN DEFAULT FALSE,
  step_1_objective TEXT,
  step_1_benefits TEXT,
  step_1_risks TEXT,
  step_2_specs TEXT,
  step_2_criteria TEXT,
  step_2_prereqs TEXT,
  step_2_estimation TEXT,
  step_3_notes TEXT,
  step_3_files TEXT,
  step_3_blockers TEXT,
  step_4_tests TEXT,
  step_4_results TEXT,
  step_4_improvements TEXT,
  step_5_lessons TEXT,
  step_5_deliverables TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  -- from 020
  controller TEXT,
  -- from 024
  feature_type TEXT DEFAULT 'dev',
  parent_id UUID,
  -- from 025
  stage TEXT DEFAULT 'feature' CHECK (stage IN ('idea','feature')),
  work_kind TEXT DEFAULT 'feature' CHECK (work_kind IN ('feature','mission','task')),
  sprint_id UUID,
  deadline TIMESTAMPTZ,
  project_id UUID
);

-- 17. PROJECTS
CREATE TABLE IF NOT EXISTS cockpit_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  why TEXT,
  how TEXT,
  what TEXT,
  status TEXT DEFAULT 'proposed'
    CHECK (status IN ('proposed','voting','locked','active','completed','archived')),
  responsible TEXT,
  controller TEXT,
  repo_url TEXT,
  live_url TEXT,
  priority TEXT DEFAULT 'medium'
    CHECK (priority IN ('low','medium','high','critical')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 18. SPRINTS
CREATE TABLE IF NOT EXISTS cockpit_sprints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  goal TEXT,
  status TEXT DEFAULT 'proposed'
    CHECK (status IN ('proposed','active','completed','cancelled')),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 19. PROBLEMS
CREATE TABLE IF NOT EXISTS cockpit_problems (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','wontfix')),
  reported_by TEXT,
  assigned_to TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- 20. CHAT MESSAGES
CREATE TABLE IF NOT EXISTS cockpit_chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author_email TEXT NOT NULL,
  author_name TEXT,
  body TEXT NOT NULL,
  channel TEXT DEFAULT 'general',
  reply_to UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_channel ON cockpit_chat_messages(channel, created_at DESC);

-- 21. ATOMIC VOTE FUNCTION
CREATE OR REPLACE FUNCTION submit_project_vote(
  p_project_id UUID,
  p_vote TEXT,
  p_voter_id UUID,
  p_active_count INTEGER
) RETURNS TABLE(new_status TEXT, agree_count BIGINT, disagree_count BIGINT, neutral_count BIGINT)
LANGUAGE plpgsql AS $$
DECLARE
  threshold INTEGER;
  agrees BIGINT;
BEGIN
  DELETE FROM cockpit_comments
    WHERE entity_type = 'project' AND entity_id = p_project_id
    AND author_id = p_voter_id::TEXT AND vote IS NOT NULL;
  INSERT INTO cockpit_comments (entity_type, entity_id, author_id, vote, body)
    VALUES ('project', p_project_id, p_voter_id::TEXT, p_vote, '');
  threshold := GREATEST(2, CEIL(p_active_count * 0.66));
  SELECT COUNT(*) INTO agrees FROM cockpit_comments
    WHERE entity_type = 'project' AND entity_id = p_project_id AND vote = 'agree';
  IF agrees >= threshold THEN
    UPDATE cockpit_projects SET status = 'locked' WHERE id = p_project_id AND status = 'voting';
  END IF;
  RETURN QUERY
    SELECT cp.status,
      (SELECT COUNT(*) FROM cockpit_comments WHERE entity_type='project' AND entity_id=p_project_id AND vote='agree'),
      (SELECT COUNT(*) FROM cockpit_comments WHERE entity_type='project' AND entity_id=p_project_id AND vote='disagree'),
      (SELECT COUNT(*) FROM cockpit_comments WHERE entity_type='project' AND entity_id=p_project_id AND vote='neutral')
    FROM cockpit_projects cp WHERE cp.id = p_project_id;
END;
$$;

-- ============================================
-- 22. AGENT SYSTEM (from migration 026)
-- ============================================

CREATE TABLE IF NOT EXISTS cockpit_agent_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('identity','soul','rules','tools')),
  version INT NOT NULL DEFAULT 1,
  body JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_docs_active ON cockpit_agent_docs (kind) WHERE is_active;

CREATE TABLE IF NOT EXISTS cockpit_agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL CHECK (scope IN ('global','user','project')),
  scope_key TEXT,
  content TEXT NOT NULL,
  embedding TEXT,
  source TEXT,
  importance INT DEFAULT 5,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_agent_memory_scope ON cockpit_agent_memory (scope, scope_key);

CREATE TABLE IF NOT EXISTS cockpit_agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT,
  surface TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  turn_count INT DEFAULT 0,
  total_input_tokens INT DEFAULT 0,
  total_output_tokens INT DEFAULT 0,
  total_cost_usd NUMERIC(10,6) DEFAULT 0,
  metadata JSONB DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_user ON cockpit_agent_sessions (user_email, started_at DESC);

CREATE TABLE IF NOT EXISTS cockpit_agent_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES cockpit_agent_sessions(id) ON DELETE CASCADE,
  user_email TEXT,
  surface TEXT NOT NULL,
  activity TEXT,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INT NOT NULL,
  output_tokens INT NOT NULL,
  cost_usd NUMERIC(10,6) NOT NULL,
  latency_ms INT,
  user_message TEXT,
  assistant_message TEXT,
  actions_executed JSONB,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agent_turns_session ON cockpit_agent_turns (session_id);
CREATE INDEX IF NOT EXISTS idx_agent_turns_user ON cockpit_agent_turns (user_email, created_at DESC);

CREATE TABLE IF NOT EXISTS cockpit_api_keys_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  label TEXT,
  key_ciphertext TEXT NOT NULL,
  key_last_4 TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  monthly_budget_usd NUMERIC(10,2) DEFAULT 20.00,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  rotated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS cockpit_agent_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('chat','embedding','extraction','summary')),
  provider TEXT NOT NULL,
  model_id TEXT NOT NULL,
  input_cost_per_1m_usd NUMERIC(10,4),
  output_cost_per_1m_usd NUMERIC(10,4),
  is_default BOOLEAN DEFAULT false,
  enabled BOOLEAN DEFAULT true
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_models_default ON cockpit_agent_models (role) WHERE is_default;

CREATE TABLE IF NOT EXISTS cockpit_agent_user_prefs (
  user_email TEXT PRIMARY KEY,
  preferred_name TEXT,
  preferred_language TEXT,
  preferred_tone TEXT,
  share_memories_with_team BOOLEAN DEFAULT false,
  notifications_enabled BOOLEAN DEFAULT true,
  telegram_chat_id TEXT,
  disabled_tools TEXT[],
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Agent costs materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS cockpit_agent_costs_daily AS
SELECT
  date_trunc('day', created_at) AS day,
  user_email, surface, activity, provider, model,
  sum(input_tokens) AS total_input,
  sum(output_tokens) AS total_output,
  sum(cost_usd) AS total_cost,
  count(*) AS turn_count
FROM cockpit_agent_turns
GROUP BY 1,2,3,4,5,6;

-- ============================================
-- SEED: Omar & Alex team
-- ============================================

INSERT INTO cockpit_members (email, name, role, builder, color, status) VALUES
  ('omar@omar.paris', 'Omar', 'admin', 'A', '#3b82f6', 'active'),
  ('alexwillemetz@gmail.com', 'Alex', 'cofounder', 'B', '#10b981', 'active')
ON CONFLICT (email) DO NOTHING;

-- Seed: Default agent identity
INSERT INTO cockpit_agent_docs (kind, version, body, is_active, updated_by) VALUES
('identity', 1, '{"name":"Steve","title":"Startup Assistant","default_language":"fr","tone_label":"friendly-professional"}'::jsonb, true, 'system'),
('soul', 1, '{"mission":"Help Omar & Alex move faster, make better decisions, and stay aligned.","personality":"Calm, competent, concise.","values":["clarity","honesty","speed","respect"]}'::jsonb, true, 'system'),
('rules', 1, '[{"id":"r1","rule":"Every LLM call must be logged","severity":"hard"},{"id":"r2","rule":"User memories are private by default","severity":"hard"},{"id":"r3","rule":"Respond in the language the user writes in","severity":"soft"}]'::jsonb, true, 'system'),
('tools', 1, '[]'::jsonb, true, 'system')
ON CONFLICT DO NOTHING;

-- Seed: Default models
INSERT INTO cockpit_agent_models (role, provider, model_id, input_cost_per_1m_usd, output_cost_per_1m_usd, is_default, enabled) VALUES
('chat', 'openrouter', 'anthropic/claude-3-haiku', 0.25, 1.25, true, true),
('embedding', 'openai', 'text-embedding-3-small', 0.02, 0, true, true),
('extraction', 'openrouter', 'anthropic/claude-3-haiku', 0.25, 1.25, true, true),
('summary', 'openrouter', 'mistralai/mistral-small-latest', 0.10, 0.30, true, true)
ON CONFLICT DO NOTHING;

-- ============================================
-- DONE — Self-hosted setup complete
-- ============================================
