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
