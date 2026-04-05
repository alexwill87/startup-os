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
