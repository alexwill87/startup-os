import { supabase } from "./supabase";

/**
 * Cast a vote (1 per person per item). If already voted, removes the vote (toggle).
 * @param {string} entityType - "feedback", "response", "decision", etc.
 * @param {string} entityId - UUID of the item
 * @param {string} direction - "up" or "down"
 * @returns {{ voted: boolean, error: string|null }}
 */
export async function castVote(entityType, entityId, direction) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { voted: false, error: "Not logged in" };

  // Check if already voted
  const { data: existing } = await supabase
    .from("cockpit_votes")
    .select("id, direction")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("voter_id", user.id)
    .maybeSingle();

  if (existing) {
    // Already voted — toggle off
    await supabase.from("cockpit_votes").delete().eq("id", existing.id);
    return { voted: false, wasDirection: existing.direction };
  }

  // Get member name
  const { data: member } = await supabase
    .from("cockpit_members")
    .select("name")
    .eq("email", user.email)
    .maybeSingle();

  // Cast new vote
  const { error } = await supabase.from("cockpit_votes").insert({
    entity_type: entityType,
    entity_id: entityId,
    direction,
    voter_id: user.id,
    voter_name: member?.name || user.email.split("@")[0],
  });

  if (error?.code === "23505") {
    // Unique constraint violation — already voted
    return { voted: false, error: "Already voted" };
  }

  return { voted: true, error: error?.message || null };
}

/**
 * Get vote counts for an entity
 */
export async function getVoteCounts(entityType, entityId) {
  const { data } = await supabase
    .from("cockpit_votes")
    .select("direction")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId);

  const votes = data || [];
  return {
    up: votes.filter((v) => v.direction === "up").length,
    down: votes.filter((v) => v.direction === "down").length,
    total: votes.filter((v) => v.direction === "up").length - votes.filter((v) => v.direction === "down").length,
  };
}

/**
 * Check if current user has voted on an entity
 */
export async function hasVoted(entityType, entityId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("cockpit_votes")
    .select("direction")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("voter_id", user.id)
    .maybeSingle();

  return data?.direction || null;
}
