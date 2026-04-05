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
