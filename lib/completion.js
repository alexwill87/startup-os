import { supabase } from "./supabase";

/**
 * Calculate real completion from cockpit_checklist table
 * Each item has a status: todo, in_progress, done, validated, skipped
 * Returns { pillarId: { items, done, total, required, pct } }
 */
export async function calculateCompletion() {
  const { data: items } = await supabase
    .from("cockpit_checklist")
    .select("*")
    .order("sort_order", { ascending: true });

  if (!items || items.length === 0) {
    // Fallback if table is empty
    return {
      why: empty(), team: empty(), resources: empty(), project: empty(),
      market: empty(), finances: empty(), analytics: empty(),
    };
  }

  const pillars = {};

  for (const item of items) {
    if (!pillars[item.pillar]) {
      pillars[item.pillar] = { items: [], done: 0, total: 0, required: 0, requiredDone: 0 };
    }

    const p = pillars[item.pillar];
    p.items.push(item);
    p.total++;

    if (item.required) p.required++;

    const isDone = item.status === "done" || item.status === "validated";
    if (isDone) {
      p.done++;
      if (item.required) p.requiredDone++;
    }
  }

  // Calculate percentages
  for (const key of Object.keys(pillars)) {
    const p = pillars[key];
    // Percentage based on required items only (optional items are bonus)
    p.pct = p.required > 0 ? Math.round((p.requiredDone / p.required) * 100) : 0;
  }

  // Ensure all 7 pillars exist
  const allPillars = ["why", "team", "resources", "project", "market", "finances", "analytics"];
  for (const key of allPillars) {
    if (!pillars[key]) pillars[key] = empty();
  }

  return pillars;
}

function empty() {
  return { items: [], done: 0, total: 0, required: 0, requiredDone: 0, pct: 0 };
}
