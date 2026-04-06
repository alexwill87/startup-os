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
