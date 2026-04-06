-- ============================================
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
UPDATE cockpit_members SET role = 'cofounder' WHERE email = 'alexwillemetz@gmail.com';
