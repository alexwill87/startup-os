-- Migration 024: Universal Features — types, sub-features, dependencies

ALTER TABLE cockpit_features_os ADD COLUMN IF NOT EXISTS feature_type TEXT DEFAULT 'dev';
ALTER TABLE cockpit_features_os DROP CONSTRAINT IF EXISTS cockpit_features_os_feature_type_check;
ALTER TABLE cockpit_features_os ADD CONSTRAINT cockpit_features_os_feature_type_check
  CHECK (feature_type IN ('dev', 'design', 'marketing', 'communication', 'research', 'audit', 'deployment', 'operations'));

ALTER TABLE cockpit_features_os ADD COLUMN IF NOT EXISTS parent_feature_id UUID REFERENCES cockpit_features_os(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS cockpit_feature_dependencies (
  feature_id UUID NOT NULL REFERENCES cockpit_features_os(id) ON DELETE CASCADE,
  depends_on_id UUID NOT NULL REFERENCES cockpit_features_os(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (feature_id, depends_on_id),
  CHECK (feature_id != depends_on_id)
);

ALTER TABLE cockpit_feature_dependencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feature_deps_read" ON cockpit_feature_dependencies FOR SELECT USING (true);
CREATE POLICY "feature_deps_write" ON cockpit_feature_dependencies FOR ALL USING (true) WITH CHECK (true);
