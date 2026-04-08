-- ============================================
-- SEED: Default Workflow Template (11 steps)
-- Run this AFTER all migrations.
-- This creates the default feature development workflow.
-- The workflow is also hardcoded as fallback in workflow/page.js.
-- ============================================

-- Only insert if no workflow exists yet
INSERT INTO cockpit_vision (topic, title, body)
SELECT 'workflow', 'Feature Workflow', '{"steps":[
  {"id":"prep","name":"Preparation","description":"Gather context, define scope, identify stakeholders","min_role":"cofounder","can_be_agent":false,"order":1},
  {"id":"ref_int","name":"Internal Reference","description":"Check existing features, goals, and docs for overlap","min_role":"cofounder","can_be_agent":true,"order":2},
  {"id":"ref_ext","name":"External Research","description":"Benchmark competitors, find best practices","min_role":"mentor","can_be_agent":true,"order":3},
  {"id":"comm","name":"Communication","description":"Announce the feature to the team, share context","min_role":"cofounder","can_be_agent":false,"order":4},
  {"id":"debate","name":"Team Debate","description":"Discuss approach, collect opinions, resolve disagreements","min_role":"cofounder","can_be_agent":false,"order":5},
  {"id":"define","name":"Definition & Specs","description":"Write technical specs, define acceptance criteria","min_role":"cofounder","can_be_agent":true,"order":6},
  {"id":"config","name":"Configuration","description":"Set up environment, database, API keys","min_role":"cofounder","can_be_agent":true,"order":7},
  {"id":"build","name":"Build / Deploy","description":"Implement the feature, intermediate deployments","min_role":"cofounder","can_be_agent":true,"order":8},
  {"id":"test","name":"Test & QA","description":"Manual and automated testing, edge cases","min_role":"cofounder","can_be_agent":false,"order":9},
  {"id":"review","name":"Review & Control","description":"Code review, stakeholder validation","min_role":"mentor","can_be_agent":false,"order":10},
  {"id":"confirm","name":"Confirmation & Launch","description":"Final approval, production deploy, announce","min_role":"cofounder","can_be_agent":false,"order":11}
]}'
WHERE NOT EXISTS (SELECT 1 FROM cockpit_vision WHERE topic = 'workflow');
