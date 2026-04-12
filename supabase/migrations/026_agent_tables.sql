-- Migration 026: Agent system tables
-- SuperAgent_Plan v1.0 — Phase 1 Foundation
-- Creates all tables for the in-house AI agent (Startup Assistant)

-- ============================================================
-- 1. Agent documents (identity, soul, rules, tools)
-- ============================================================
CREATE TABLE IF NOT EXISTS cockpit_agent_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('identity', 'soul', 'rules', 'tools')),
  version INT NOT NULL DEFAULT 1,
  body JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_docs_active ON cockpit_agent_docs (kind) WHERE is_active;

-- ============================================================
-- 2. Agent memory (semantic, with pgvector)
-- ============================================================
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS cockpit_agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL CHECK (scope IN ('global', 'user', 'project')),
  scope_key TEXT,
  content TEXT NOT NULL,
  embedding vector(1536),
  source TEXT,
  importance INT DEFAULT 5,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_agent_memory_scope ON cockpit_agent_memory (scope, scope_key);

-- RPC for semantic search (PostgREST doesn't support <=> directly)
CREATE OR REPLACE FUNCTION match_memories(
  query_embedding vector(1536),
  match_scope TEXT,
  match_scope_key TEXT DEFAULT NULL,
  match_count INT DEFAULT 10
) RETURNS TABLE (id UUID, content TEXT, similarity FLOAT, importance INT)
LANGUAGE sql STABLE AS $$
  SELECT id, content, 1 - (embedding <=> query_embedding) AS similarity, importance
  FROM cockpit_agent_memory
  WHERE scope = match_scope
    AND (match_scope_key IS NULL OR scope_key = match_scope_key)
    AND (expires_at IS NULL OR expires_at > now())
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ============================================================
-- 3. Agent sessions
-- ============================================================
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

-- ============================================================
-- 4. Agent turns (every LLM call logged — invariant #2)
-- ============================================================
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
CREATE INDEX IF NOT EXISTS idx_agent_turns_activity ON cockpit_agent_turns (activity, created_at DESC);

-- ============================================================
-- 5. API keys v2 (encrypted AES-256-GCM)
-- ============================================================
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

-- ============================================================
-- 6. Agent models (config per role)
-- ============================================================
CREATE TABLE IF NOT EXISTS cockpit_agent_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('chat', 'embedding', 'extraction', 'summary')),
  provider TEXT NOT NULL,
  model_id TEXT NOT NULL,
  input_cost_per_1m_usd NUMERIC(10,4),
  output_cost_per_1m_usd NUMERIC(10,4),
  is_default BOOLEAN DEFAULT false,
  enabled BOOLEAN DEFAULT true
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_models_default ON cockpit_agent_models (role) WHERE is_default;

-- ============================================================
-- 7. User preferences
-- ============================================================
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

-- ============================================================
-- 8. Materialized view for cost dashboard
-- ============================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS cockpit_agent_costs_daily AS
SELECT
  date_trunc('day', created_at) AS day,
  user_email,
  surface,
  activity,
  provider,
  model,
  sum(input_tokens) AS total_input,
  sum(output_tokens) AS total_output,
  sum(cost_usd) AS total_cost,
  count(*) AS turn_count
FROM cockpit_agent_turns
GROUP BY 1,2,3,4,5,6;

-- ============================================================
-- 9. RLS policies (all auth users can access)
-- ============================================================
ALTER TABLE cockpit_agent_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cockpit_agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE cockpit_agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cockpit_agent_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE cockpit_api_keys_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE cockpit_agent_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE cockpit_agent_user_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_docs_all" ON cockpit_agent_docs FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "agent_memory_all" ON cockpit_agent_memory FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "agent_sessions_all" ON cockpit_agent_sessions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "agent_turns_all" ON cockpit_agent_turns FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "api_keys_v2_all" ON cockpit_api_keys_v2 FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "agent_models_all" ON cockpit_agent_models FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "agent_user_prefs_all" ON cockpit_agent_user_prefs FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- 10. Seed: Default agent identity (Steve, Startup Assistant)
-- ============================================================
INSERT INTO cockpit_agent_docs (kind, version, body, is_active, updated_by) VALUES
('identity', 1, '{
  "name": "Steve",
  "title": "Startup Assistant",
  "avatar_url": null,
  "default_language": "en",
  "tone_label": "friendly-professional"
}'::jsonb, true, 'system'),

('soul', 1, '{
  "mission": "Help startup founders move faster, make better decisions, and stay aligned as a team.",
  "personality": "Calm, competent, concise. Never condescending. Knows when to ask before acting.",
  "values": ["clarity", "honesty", "speed", "respect"],
  "examples": [
    "When asked to create a task, do it immediately and confirm.",
    "When asked for advice, give a clear recommendation with one sentence of reasoning.",
    "When unsure about a decision, present 2-3 options with trade-offs."
  ],
  "do_list": [
    "Be concise — 1-3 sentences by default",
    "Use the team members real names",
    "Reference project data when relevant",
    "Confirm actions with a short summary"
  ],
  "dont_list": [
    "Never vote on behalf of a member without explicit confirmation",
    "Never expose API keys or secrets",
    "Never make up data — say you dont know",
    "Never use emojis in the cockpit UI"
  ]
}'::jsonb, true, 'system'),

('rules', 1, '[
  {"id": "r1", "rule": "Every LLM call must be logged in cockpit_agent_turns", "reason": "Observability invariant", "severity": "hard"},
  {"id": "r2", "rule": "User memories are private by default", "reason": "Privacy respect", "severity": "hard"},
  {"id": "r3", "rule": "vote_decision always requires confirmation", "reason": "Sensitive action", "severity": "hard"},
  {"id": "r4", "rule": "API keys never in clear text", "reason": "Security", "severity": "hard"},
  {"id": "r5", "rule": "Respond in the language the user writes in", "reason": "UX", "severity": "soft"},
  {"id": "r6", "rule": "Keep responses under 200 words unless asked for more", "reason": "Conciseness", "severity": "soft"}
]'::jsonb, true, 'system'),

('tools', 1, '[
  {"id": "update_profile", "name": "Update profile", "description": "Update the current users profile", "enabled": true, "scope": "all", "requires_confirmation": false},
  {"id": "create_task", "name": "Create task", "description": "Create a task on the board", "enabled": true, "scope": "all", "requires_confirmation": false},
  {"id": "update_task_status", "name": "Update task status", "description": "Move a task forward", "enabled": true, "scope": "all", "requires_confirmation": true},
  {"id": "create_project", "name": "Create project", "description": "Propose a new project", "enabled": true, "scope": "all", "requires_confirmation": false},
  {"id": "update_vision", "name": "Update vision", "description": "Edit a vision section", "enabled": true, "scope": "all", "requires_confirmation": true},
  {"id": "log_note", "name": "Log note", "description": "Add a strategic note", "enabled": true, "scope": "all", "requires_confirmation": false},
  {"id": "remember", "name": "Remember", "description": "Save a fact to memory", "enabled": true, "scope": "all", "requires_confirmation": false},
  {"id": "forget", "name": "Forget", "description": "Remove a memory", "enabled": true, "scope": "all", "requires_confirmation": true},
  {"id": "vote_decision", "name": "Vote on decision", "description": "Vote on behalf of the current user", "enabled": true, "scope": "all", "requires_confirmation": true},
  {"id": "fill_page", "name": "Fill page", "description": "Fill multiple fields in diff mode", "enabled": true, "scope": "all", "requires_confirmation": true},
  {"id": "add_kpi_entry", "name": "Add KPI entry", "description": "Log a KPI data point", "enabled": true, "scope": "all", "requires_confirmation": false}
]'::jsonb, true, 'system')
ON CONFLICT DO NOTHING;

-- Seed: Default models
INSERT INTO cockpit_agent_models (role, provider, model_id, input_cost_per_1m_usd, output_cost_per_1m_usd, is_default, enabled) VALUES
('chat', 'openrouter', 'anthropic/claude-3-haiku', 0.25, 1.25, true, true),
('embedding', 'openai', 'text-embedding-3-small', 0.02, 0, true, true),
('extraction', 'openrouter', 'anthropic/claude-3-haiku', 0.25, 1.25, true, true),
('summary', 'openrouter', 'mistralai/mistral-small-latest', 0.10, 0.30, true, true)
ON CONFLICT DO NOTHING;
