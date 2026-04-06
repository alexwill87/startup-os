import { supabase } from "./supabase";

/**
 * Sync checklist items with actual content in the database.
 * Checks if content exists for each checklist item and updates status accordingly.
 * Call this after any content change (vision note added, resource added, etc.)
 */
export async function syncChecklist() {
  const { data: items } = await supabase
    .from("cockpit_checklist")
    .select("id, pillar, category, title, status")
    .in("status", ["todo", "in_progress"]);

  if (!items || items.length === 0) return;

  // Gather all counts we need
  const [
    { data: vision },
    { data: decisions },
    { data: tasks },
    { data: resources },
    { data: docs },
    { data: retro },
    { data: kpis },
    { data: members },
    { data: files },
    { data: competitors },
  ] = await Promise.all([
    supabase.from("cockpit_vision").select("topic, title, body"),
    supabase.from("cockpit_decisions").select("status"),
    supabase.from("cockpit_tasks").select("status, builder"),
    supabase.from("cockpit_resources").select("category"),
    supabase.from("cockpit_docs").select("id"),
    supabase.from("cockpit_retro").select("id"),
    supabase.from("cockpit_kpis").select("id"),
    supabase.from("cockpit_members").select("bio, phone, linkedin, skills, builder, user_id, status").in("status", ["active"]),
    supabase.from("cockpit_files").select("pillar"),
    supabase.from("cockpit_resources").select("id").eq("category", "competitor"),
  ]);

  const v = vision || [];
  const d = decisions || [];
  const t = tasks || [];
  const r = resources || [];
  const m = members || [];

  // Build a map of what's satisfied
  const checks = {
    // WHY
    "Mission statement": v.some((x) => x.topic === "product" && x.body?.length > 10),
    "Problem statement": v.some((x) => x.title?.toLowerCase().includes("problem") || (x.topic === "product" && v.filter((y) => y.topic === "product").length >= 2)),
    "Why us?": v.some((x) => x.title?.toLowerCase().includes("why us") || x.title?.toLowerCase().includes("advantage") || x.title?.toLowerCase().includes("speed")),
    "Vision 5-10 years": v.some((x) => x.title?.toLowerCase().includes("vision") || (x.topic === "product" && x.body?.length > 100)),
    "Core values": v.some((x) => x.title?.toLowerCase().includes("values") || x.title?.toLowerCase().includes("valeurs")),
    "North Star Metric": v.some((x) => x.title?.toLowerCase().includes("north star") || x.title?.toLowerCase().includes("metric") || x.title?.toLowerCase().includes("chiffres")),
    "mission.md": v.some((x) => x.topic === "product" && x.body?.length > 20),
    "vision.md": v.some((x) => (x.topic === "product" || x.title?.toLowerCase().includes("vision")) && x.body?.length > 50),
    "values.md": v.some((x) => x.title?.toLowerCase().includes("values")),
    "problem_statement.md": v.some((x) => x.topic === "product" && v.filter((y) => y.topic === "product").length >= 2),
    "competitive_analysis": (competitors || []).length >= 2,
    "brand_guidelines.md": false,

    // TEAM
    "Key team members identified": m.length >= 2,
    "Missing roles identified": false,
    "Decision-making process": d.length >= 1,
    "Collaboration rules": false,
    "Conflict resolution": false,
    "All profiles completed": m.length > 0 && m.every((x) => x.bio && x.phone && x.linkedin),
    "All members logged in": m.length > 0 && m.every((x) => x.user_id),
    "team.md": m.length >= 2,
    "hiring_plan.md": false,
    "collaboration_rules.md": false,
    "org_chart": false,
    "onboarding_checklist.md": false,

    // RESOURCES
    "Tools inventory": r.some((x) => x.category === "tool"),
    "Budget defined": r.some((x) => x.category === "admin"),
    "Security & passwords": false,
    "Key vendors identified": false,
    "Hidden resources": false,
    "tools.md": r.filter((x) => x.category === "tool" || x.category === "api_doc").length >= 3,
    "budget.md": r.some((x) => x.category === "admin"),
    "security.md": false,
    "10+ resources added": r.length >= 10,
    "Files uploaded": (files || []).length > 0,

    // PROJECT
    "Roadmap defined": t.length >= 5,
    "Key deliverables listed": t.length >= 3,
    "Prioritization method": false,
    "Risks identified": false,
    "Delay management": false,
    "roadmap.md": t.length >= 5,
    "deliverables.md": t.length >= 3,
    "risk_register.md": false,
    "10+ tasks created": t.length >= 10,
    "Tasks assigned to all builders": m.length > 0 && new Set(t.map((x) => x.builder)).size >= m.length,
    "Documentation imported": (docs || []).length > 0,
    "First retrospective done": (retro || []).length > 0,

    // MARKET
    "Personas defined": v.some((x) => x.topic === "market" && x.body?.length > 30),
    "Acquisition strategy": v.some((x) => x.topic === "growth"),
    "Conversion funnel": false,
    "Feedback process": false,
    "Direct competitors": (competitors || []).length >= 1,
    "personas/": v.some((x) => x.topic === "market"),
    "acquisition_strategy.md": v.some((x) => x.topic === "growth" && x.body?.length > 30),
    "feedback_process.md": false,
    "market_size.md": v.some((x) => x.topic === "market" && x.body?.length > 100),
    "3+ competitors listed": (competitors || []).length >= 3,

    // FINANCES
    "Burn rate calculated": false,
    "Revenue streams defined": v.some((x) => x.topic === "monetization"),
    "Business model chosen": v.some((x) => x.topic === "monetization" && x.body?.length > 30),
    "Investors identified": false,
    "Accounting setup": false,
    "burn_rate.md": false,
    "revenue_streams.md": v.some((x) => x.topic === "monetization"),
    "business_model.md": v.some((x) => x.topic === "monetization" && x.body?.length > 30),
    "pitch_deck": false,
    "cap_table.md": false,

    // ANALYTICS
    "KPIs defined": (kpis || []).length > 0,
    "Tracking tools chosen": false,
    "Alert thresholds set": false,
    "Insights sharing process": false,
    "Central dashboard exists": true, // This IS the dashboard
    "kpis.md": (kpis || []).length > 0,
    "alerts.md": false,
    "dashboard.md": true,
    "First KPI entry logged": (kpis || []).length > 0,
    "3+ KPI entries": (kpis || []).length >= 3,
  };

  // Update items that should be marked as done
  for (const item of items) {
    const shouldBeDone = checks[item.title];
    if (shouldBeDone && item.status === "todo") {
      await supabase
        .from("cockpit_checklist")
        .update({ status: "done", updated_at: new Date().toISOString() })
        .eq("id", item.id);
    }
  }
}
