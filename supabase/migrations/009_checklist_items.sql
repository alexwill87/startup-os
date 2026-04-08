-- ============================================
-- CHECKLIST ITEMS — Every expected deliverable per pillar
-- Each item = a question, document, or action that must be completed
-- ============================================

CREATE TABLE IF NOT EXISTS cockpit_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pillar text NOT NULL CHECK (pillar IN ('why','team','resources','project','market','finances','analytics')),
  category text NOT NULL DEFAULT 'document',
  title text NOT NULL,
  description text,
  format text,
  required boolean DEFAULT true,
  status text DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done','validated','skipped')),
  validated_by uuid REFERENCES auth.users(id),
  validated_by_name text,
  assigned_to text,
  evidence_url text,
  notes text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE cockpit_checklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "checklist_read" ON cockpit_checklist FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "checklist_write" ON cockpit_checklist FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "checklist_update" ON cockpit_checklist FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "checklist_delete" ON cockpit_checklist FOR DELETE USING (auth.uid() IS NOT NULL);
ALTER PUBLICATION supabase_realtime ADD TABLE cockpit_checklist;
CREATE INDEX IF NOT EXISTS idx_checklist_pillar ON cockpit_checklist(pillar);
CREATE INDEX IF NOT EXISTS idx_checklist_status ON cockpit_checklist(status);

-- ============================================
-- SEED: All expected items from StartupKit.md
-- ============================================

-- WHY (6 questions + 4 documents = 10 items)
INSERT INTO cockpit_checklist (pillar, category, title, description, format, required, sort_order) VALUES
('why', 'question', 'Mission statement', 'What is the mission in one sentence?', 'Short text (1 line)', true, 1),
('why', 'question', 'Problem statement', 'What problem are we solving? With concrete examples.', 'Paragraph + examples', true, 2),
('why', 'question', 'Why us?', 'What is our competitive advantage? 3-5 key points.', 'Bullet list', true, 3),
('why', 'question', 'Vision 5-10 years', 'Where is the company going long-term?', '3 paragraphs', true, 4),
('why', 'question', 'Core values', 'What are the 5-10 fundamental values?', 'List', true, 5),
('why', 'question', 'North Star Metric', 'What single metric defines success?', 'Metric + explanation', true, 6),
('why', 'document', 'mission.md', 'Written mission statement document', 'Markdown file', true, 7),
('why', 'document', 'vision.md', 'Vision document with long-term direction', 'Markdown file', true, 8),
('why', 'document', 'values.md', 'List of core values', 'Markdown file', true, 9),
('why', 'document', 'problem_statement.md', 'Problem statement with client examples', 'Markdown file', true, 10),
('why', 'document', 'competitive_analysis', 'Benchmark of competitors', 'PDF or MD', false, 11),
('why', 'document', 'brand_guidelines.md', 'Brand tone, voice, visual identity', 'Markdown file', false, 12);

-- TEAM (5 questions + 5 documents + profiles)
INSERT INTO cockpit_checklist (pillar, category, title, description, format, required, sort_order) VALUES
('team', 'question', 'Key team members identified', 'Who are the members? Name, role, skills.', 'Table', true, 1),
('team', 'question', 'Missing roles identified', 'What roles are still needed? Priority list.', 'Priority list', true, 2),
('team', 'question', 'Decision-making process', 'How do we make decisions? (consensus, vote, lead decides)', 'Process description', true, 3),
('team', 'question', 'Collaboration rules', 'Working hours, communication norms, meeting rules', 'List of rules', true, 4),
('team', 'question', 'Conflict resolution', 'How do we handle disagreements?', '3-step process', true, 5),
('team', 'action', 'All profiles completed', 'Every member has filled their profile (bio, phone, LinkedIn, skills)', 'Profile page', true, 6),
('team', 'action', 'All members logged in', 'Every invited member has actually logged in', 'Auth check', true, 7),
('team', 'document', 'team.md', 'Team roster with roles and responsibilities', 'Markdown', true, 8),
('team', 'document', 'hiring_plan.md', 'Roles needed and hiring priorities', 'Markdown', true, 9),
('team', 'document', 'collaboration_rules.md', 'Rules of engagement for the team', 'Markdown', true, 10),
('team', 'document', 'org_chart', 'Visual organization chart', 'PDF or image', false, 11),
('team', 'document', 'onboarding_checklist.md', 'Steps for new team members', 'Markdown', false, 12);

-- RESOURCES (5 questions + 3 documents)
INSERT INTO cockpit_checklist (pillar, category, title, description, format, required, sort_order) VALUES
('resources', 'question', 'Tools inventory', 'What tools do we use? (name, link, cost, owner)', 'Table', true, 1),
('resources', 'question', 'Budget defined', 'What is the current budget breakdown?', 'Table with amounts', true, 2),
('resources', 'question', 'Security & passwords', 'Where are passwords stored? Who has access?', 'Link to vault', true, 3),
('resources', 'question', 'Key vendors identified', 'Who are our vendors? Contact info, contracts.', 'List', true, 4),
('resources', 'question', 'Hidden resources', 'Any credits, free tiers, contacts to leverage?', 'List', false, 5),
('resources', 'document', 'tools.md', 'Complete tools inventory', 'Markdown', true, 6),
('resources', 'document', 'budget.md', 'Budget breakdown document', 'Markdown', true, 7),
('resources', 'document', 'security.md', 'Security and access documentation', 'Markdown', true, 8),
('resources', 'action', '10+ resources added', 'At least 10 links, tools, or docs in the system', 'Dashboard check', true, 9),
('resources', 'action', 'Files uploaded', 'At least 1 file uploaded per pillar', 'Storage check', false, 10);

-- PROJECT (5 questions + 4 documents + actions)
INSERT INTO cockpit_checklist (pillar, category, title, description, format, required, sort_order) VALUES
('project', 'question', 'Roadmap defined', '6-month roadmap with milestones', 'Timeline', true, 1),
('project', 'question', 'Key deliverables listed', 'What are we delivering? With deadlines.', 'List + dates', true, 2),
('project', 'question', 'Prioritization method', 'How do we prioritize? RICE, MoSCoW, etc.', 'Method description', true, 3),
('project', 'question', 'Risks identified', 'What could go wrong? Impact and mitigation.', 'Risk table', true, 4),
('project', 'question', 'Delay management', 'What happens when we fall behind?', '3-step process', true, 5),
('project', 'document', 'roadmap.md', 'Written roadmap with timeline', 'Markdown', true, 6),
('project', 'document', 'deliverables.md', 'List of deliverables with deadlines', 'Markdown', true, 7),
('project', 'document', 'risk_register.md', 'Risk register with mitigation plans', 'Markdown', true, 8),
('project', 'action', '10+ tasks created', 'Board has at least 10 tasks', 'Board check', true, 9),
('project', 'action', 'Tasks assigned to all builders', 'Every team member has tasks', 'Board check', true, 10),
('project', 'action', 'Documentation imported', 'Project docs are in the system', 'Docs check', true, 11),
('project', 'action', 'First retrospective done', 'At least 1 retro completed', 'Retro check', true, 12);

-- MARKET (5 questions + 4 documents)
INSERT INTO cockpit_checklist (pillar, category, title, description, format, required, sort_order) VALUES
('market', 'question', 'Personas defined', 'Who are the 3-5 target user personas?', 'Detailed profiles', true, 1),
('market', 'question', 'Acquisition strategy', 'How do we get customers? Channels and costs.', 'Strategy doc', true, 2),
('market', 'question', 'Conversion funnel', 'What is our AARRR funnel?', 'Funnel diagram', true, 3),
('market', 'question', 'Feedback process', 'How do we collect and process user feedback?', 'Process description', true, 4),
('market', 'question', 'Direct competitors', 'Who are the competitors? Comparison table.', 'Comparison table', true, 5),
('market', 'document', 'personas/', 'Individual persona files (3-5)', 'Markdown files', true, 6),
('market', 'document', 'acquisition_strategy.md', 'Customer acquisition plan', 'Markdown', true, 7),
('market', 'document', 'feedback_process.md', 'How feedback is collected', 'Markdown', true, 8),
('market', 'document', 'market_size.md', 'TAM, SAM, SOM analysis', 'Markdown', false, 9),
('market', 'action', '3+ competitors listed', 'At least 3 competitors documented', 'Resources check', true, 10);

-- FINANCES (5 questions + 4 documents)
INSERT INTO cockpit_checklist (pillar, category, title, description, format, required, sort_order) VALUES
('finances', 'question', 'Burn rate calculated', 'Monthly burn rate with runway duration', 'Number + months', true, 1),
('finances', 'question', 'Revenue streams defined', 'Current and future revenue sources', 'Table', true, 2),
('finances', 'question', 'Business model chosen', 'Freemium, subscription, marketplace, etc.', 'Model description', true, 3),
('finances', 'question', 'Investors identified', 'Potential investors, amounts, terms', 'List', false, 4),
('finances', 'question', 'Accounting setup', 'How is accounting handled? Tools, frequency.', 'Process', false, 5),
('finances', 'document', 'burn_rate.md', 'Burn rate calculation document', 'Markdown', true, 6),
('finances', 'document', 'revenue_streams.md', 'Revenue streams breakdown', 'Markdown', true, 7),
('finances', 'document', 'business_model.md', 'Business model description', 'Markdown', true, 8),
('finances', 'document', 'pitch_deck', 'Investor pitch deck', 'PDF', false, 9),
('finances', 'document', 'cap_table.md', 'Cap table / equity split', 'Markdown', false, 10);

-- ANALYTICS (5 questions + 3 documents)
INSERT INTO cockpit_checklist (pillar, category, title, description, format, required, sort_order) VALUES
('analytics', 'question', 'KPIs defined', 'What are the 5-10 key metrics?', 'List', true, 1),
('analytics', 'question', 'Tracking tools chosen', 'Which tools track KPIs? (Analytics, Mixpanel, etc.)', 'List with links', true, 2),
('analytics', 'question', 'Alert thresholds set', 'What triggers an alert? KPI + threshold + action.', 'Table', true, 3),
('analytics', 'question', 'Insights sharing process', 'How and when are insights shared with the team?', 'Process', true, 4),
('analytics', 'question', 'Central dashboard exists', 'Is there a live dashboard everyone can see?', 'Link to dashboard', true, 5),
('analytics', 'document', 'kpis.md', 'KPI definitions and targets', 'Markdown', true, 6),
('analytics', 'document', 'alerts.md', 'Alert rules and thresholds', 'Markdown', true, 7),
('analytics', 'document', 'dashboard.md', 'Dashboard link and screenshot', 'Markdown', true, 8),
('analytics', 'action', 'First KPI entry logged', 'At least 1 KPI snapshot in the system', 'KPIs check', true, 9),
('analytics', 'action', '3+ KPI entries', 'Regular KPI tracking (3+ entries)', 'KPIs check', true, 10);
-- Seed data moved to seeds/checklist.sql
