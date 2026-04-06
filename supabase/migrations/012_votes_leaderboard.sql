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
