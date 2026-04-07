-- Migration 014: Reset all checklist items to 'todo'
-- Reason: All existing status changes were from testing/seed, not real work.
-- The team starts fresh from here.

UPDATE cockpit_checklist SET status = 'todo', validated_by = NULL, validated_by_name = NULL
WHERE status != 'todo';
