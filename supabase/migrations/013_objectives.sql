-- ============================================
-- OBJECTIVES — The 10 big goals that drive everything
-- Each objective needs 2 validators to be approved
-- ============================================

CREATE TABLE IF NOT EXISTS cockpit_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number int2 NOT NULL,
  title text NOT NULL,
  description text,
  success_criteria text,
  pillar text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'proposed', 'approved', 'active', 'completed', 'dropped')),
  proposed_by text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cockpit_objective_validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id uuid NOT NULL REFERENCES cockpit_objectives(id) ON DELETE CASCADE,
  validator_id uuid REFERENCES auth.users(id),
  validator_name text NOT NULL,
  validator_role text,
  decision text NOT NULL CHECK (decision IN ('approve', 'reject', 'comment')),
  comment text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(objective_id, validator_name)
);

ALTER TABLE cockpit_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE cockpit_objective_validations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "obj_read" ON cockpit_objectives FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "obj_write" ON cockpit_objectives FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "obj_update" ON cockpit_objectives FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "obj_delete" ON cockpit_objectives FOR DELETE USING (auth.uid() IS NOT NULL);
CREATE POLICY "objval_read" ON cockpit_objective_validations FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "objval_write" ON cockpit_objective_validations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "objval_update" ON cockpit_objective_validations FOR UPDATE USING (auth.uid() IS NOT NULL);
ALTER PUBLICATION supabase_realtime ADD TABLE cockpit_objectives;
ALTER PUBLICATION supabase_realtime ADD TABLE cockpit_objective_validations;

-- Register Athena as an AI QA agent
INSERT INTO cockpit_members (email, name, role, builder, color, status)
VALUES ('athena@project-os.ai', 'Athena', 'mentor', 'Q', '#a855f7', 'active')
ON CONFLICT (email) DO NOTHING;
