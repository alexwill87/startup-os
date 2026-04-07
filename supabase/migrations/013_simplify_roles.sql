-- Migration 013: Simplify roles to 4 levels
-- Decision from 7 April 2026: admin, cofounder, mentor, observer
-- Old roles mapped: contributor→cofounder, ambassador/prospect/fan/member/viewer→observer

-- First: promote the 3 core builders to cofounder
UPDATE cockpit_members SET role = 'cofounder'
WHERE email IN ('abdulmalikajibade@gmail.com', 'alexwillemetz@gmail.com', 'pokamblg@gmail.com')
  AND role != 'admin';

-- Map remaining old roles
UPDATE cockpit_members SET role = 'cofounder' WHERE role = 'contributor';
UPDATE cockpit_members SET role = 'observer' WHERE role IN ('ambassador', 'prospect', 'fan', 'member', 'viewer');

-- Update the constraint to only allow 4 roles
ALTER TABLE cockpit_members DROP CONSTRAINT IF EXISTS cockpit_members_role_check;
ALTER TABLE cockpit_members ADD CONSTRAINT cockpit_members_role_check
  CHECK (role IN ('admin', 'cofounder', 'mentor', 'observer'));
