-- Cockpit Features OS — Meta-tracking of cockpit features
-- Each row = one feature of the cockpit itself

CREATE TABLE IF NOT EXISTS cockpit_features_os (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'utile'
    CHECK (category IN ('primordial', 'necessaire', 'utile', 'brouillon')),
  route TEXT,
  status TEXT NOT NULL DEFAULT 'a_verifier'
    CHECK (status IN ('reflexion', 'defini', 'en_cours', 'a_verifier', 'a_valider', 'fonctionnel', 'desactive')),
  validated_claude BOOLEAN DEFAULT FALSE,
  validated_omar BOOLEAN DEFAULT FALSE,
  validated_cofounder BOOLEAN DEFAULT FALSE,
  notes TEXT,
  test_link TEXT,
  created_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cockpit_features_os ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cockpit_features_os_read" ON cockpit_features_os
  FOR SELECT USING (true);

CREATE POLICY "cockpit_features_os_write" ON cockpit_features_os
  FOR ALL USING (true) WITH CHECK (true);
