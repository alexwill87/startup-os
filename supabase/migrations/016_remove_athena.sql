-- Migration 016: Remove Athena from cockpit_members
-- Athena is not a person, it's an agent concept. Not a member.
DELETE FROM cockpit_members WHERE email = 'athena@project-os.ai';
