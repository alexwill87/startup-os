/**
 * Sync is DISABLED.
 *
 * Checklist items should ONLY be marked as done manually by the team.
 * Auto-marking was too permissive — seed data was being counted as real work.
 *
 * The completion % is now based purely on manual status changes
 * in the PillarDashboard checklist.
 */
export async function syncChecklist() {
  // No-op. Status changes are manual only.
  return;
}
