-- ============================================
-- FILE METADATA — Context for every uploaded file
-- ============================================

CREATE TABLE IF NOT EXISTS cockpit_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  storage_path text NOT NULL,
  pillar text NOT NULL DEFAULT 'general'
    CHECK (pillar IN ('general','why','team','project','market','finance','config')),
  title text,
  description text,
  purpose text,
  status text DEFAULT 'draft'
    CHECK (status IN ('draft','review','approved','archived','outdated')),
  mime_type text,
  file_size bigint,
  tags text[],
  uploaded_by uuid REFERENCES auth.users(id),
  uploaded_by_name text,
  uploaded_by_email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE cockpit_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "files_read" ON cockpit_files
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "files_write" ON cockpit_files
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "files_update" ON cockpit_files
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "files_delete" ON cockpit_files
  FOR DELETE USING (auth.uid() IS NOT NULL);

ALTER PUBLICATION supabase_realtime ADD TABLE cockpit_files;
CREATE INDEX IF NOT EXISTS idx_files_pillar ON cockpit_files(pillar);
CREATE INDEX IF NOT EXISTS idx_files_status ON cockpit_files(status);
