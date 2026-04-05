-- ============================================
-- RADAR COCKPIT — KPIs + Resources
-- ============================================

-- 1. KPIs — Suivi des métriques Demo Day
CREATE TABLE IF NOT EXISTS cockpit_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  sprint int2 NOT NULL CHECK (sprint BETWEEN 1 AND 4),
  waitlist_signups int DEFAULT 0,
  users_registered int DEFAULT 0,
  users_active_7d int DEFAULT 0,
  cvs_generated int DEFAULT 0,
  alerts_sent int DEFAULT 0,
  users_pro int DEFAULT 0,
  mrr_eur numeric(10,2) DEFAULT 0,
  platforms_live int DEFAULT 0,
  avg_alert_time_sec int,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- 2. RESOURCES — Liens, refs, docs partagés
CREATE TABLE IF NOT EXISTS cockpit_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  url text,
  category text NOT NULL CHECK (category IN (
    'drive', 'design', 'reference', 'competitor', 'tool',
    'api_doc', 'tutorial', 'inspiration', 'admin', 'other'
  )),
  description text,
  tags text[], -- ex: ['claude', 'cv', 'stripe']
  pinned boolean DEFAULT false,
  shared_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- 3. VISION NOTES — Échanges sur la vision produit
CREATE TABLE IF NOT EXISTS cockpit_vision (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic text NOT NULL CHECK (topic IN (
    'product', 'market', 'tech', 'pitch', 'monetization', 'growth', 'other'
  )),
  title text NOT NULL,
  body text NOT NULL,
  builder text CHECK (builder IN ('A','B','C')),
  pinned boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE cockpit_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE cockpit_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE cockpit_vision ENABLE ROW LEVEL SECURITY;

CREATE POLICY "builders_all" ON cockpit_kpis FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "builders_all" ON cockpit_resources FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "builders_all" ON cockpit_vision FOR ALL USING (auth.uid() IS NOT NULL);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE cockpit_kpis;
ALTER PUBLICATION supabase_realtime ADD TABLE cockpit_resources;
ALTER PUBLICATION supabase_realtime ADD TABLE cockpit_vision;

-- Index
CREATE INDEX IF NOT EXISTS idx_kpis_date ON cockpit_kpis(date);
CREATE INDEX IF NOT EXISTS idx_resources_category ON cockpit_resources(category);
CREATE INDEX IF NOT EXISTS idx_resources_pinned ON cockpit_resources(pinned);
CREATE INDEX IF NOT EXISTS idx_vision_topic ON cockpit_vision(topic);
CREATE INDEX IF NOT EXISTS idx_vision_pinned ON cockpit_vision(pinned);
