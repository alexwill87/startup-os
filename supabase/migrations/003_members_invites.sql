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
