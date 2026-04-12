-- Migration 020: Add workflow fields to cockpit_features_os
-- 5-step workflow: Ideated → Defined → Built → Verified → Validated

-- Rename validated_omar to validated_admin (no personal names in code)
ALTER TABLE cockpit_features_os RENAME COLUMN validated_omar TO validated_admin;

-- Header fields
ALTER TABLE cockpit_features_os ADD COLUMN IF NOT EXISTS owner TEXT;
ALTER TABLE cockpit_features_os ADD COLUMN IF NOT EXISTS pillar TEXT;
ALTER TABLE cockpit_features_os ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'moyenne';
ALTER TABLE cockpit_features_os ADD COLUMN IF NOT EXISTS deadline DATE;
ALTER TABLE cockpit_features_os ADD COLUMN IF NOT EXISTS tags TEXT;
ALTER TABLE cockpit_features_os ADD COLUMN IF NOT EXISTS source TEXT;

-- Step 1: Idée
ALTER TABLE cockpit_features_os ADD COLUMN IF NOT EXISTS objective TEXT;
ALTER TABLE cockpit_features_os ADD COLUMN IF NOT EXISTS benefits TEXT;
ALTER TABLE cockpit_features_os ADD COLUMN IF NOT EXISTS risks TEXT;
ALTER TABLE cockpit_features_os ADD COLUMN IF NOT EXISTS step_1_done BOOLEAN DEFAULT FALSE;

-- Step 2: Défini
ALTER TABLE cockpit_features_os ADD COLUMN IF NOT EXISTS specifications TEXT;
ALTER TABLE cockpit_features_os ADD COLUMN IF NOT EXISTS success_criteria TEXT;
ALTER TABLE cockpit_features_os ADD COLUMN IF NOT EXISTS prerequisites TEXT;
ALTER TABLE cockpit_features_os ADD COLUMN IF NOT EXISTS time_estimate TEXT;
ALTER TABLE cockpit_features_os ADD COLUMN IF NOT EXISTS step_2_done BOOLEAN DEFAULT FALSE;

-- Step 3: Construit
ALTER TABLE cockpit_features_os ADD COLUMN IF NOT EXISTS execution_notes TEXT;
ALTER TABLE cockpit_features_os ADD COLUMN IF NOT EXISTS files_modified TEXT;
ALTER TABLE cockpit_features_os ADD COLUMN IF NOT EXISTS blockers TEXT;
ALTER TABLE cockpit_features_os ADD COLUMN IF NOT EXISTS step_3_done BOOLEAN DEFAULT FALSE;

-- Step 4: Vérifié
ALTER TABLE cockpit_features_os ADD COLUMN IF NOT EXISTS tests_done TEXT;
ALTER TABLE cockpit_features_os ADD COLUMN IF NOT EXISTS test_results TEXT;
ALTER TABLE cockpit_features_os ADD COLUMN IF NOT EXISTS improvements TEXT;
ALTER TABLE cockpit_features_os ADD COLUMN IF NOT EXISTS step_4_done BOOLEAN DEFAULT FALSE;

-- Step 5: Validé
ALTER TABLE cockpit_features_os ADD COLUMN IF NOT EXISTS lessons_learned TEXT;
ALTER TABLE cockpit_features_os ADD COLUMN IF NOT EXISTS deliverables TEXT;
ALTER TABLE cockpit_features_os ADD COLUMN IF NOT EXISTS step_5_done BOOLEAN DEFAULT FALSE;

-- Update status check to allow auto-calculated status
ALTER TABLE cockpit_features_os DROP CONSTRAINT IF EXISTS cockpit_features_os_status_check;
ALTER TABLE cockpit_features_os ADD CONSTRAINT cockpit_features_os_status_check
  CHECK (status IN ('reflexion', 'defini', 'en_cours', 'a_verifier', 'a_valider', 'fonctionnel', 'desactive', 'idee'));
