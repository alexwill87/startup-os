import { supabase } from "./supabase";

/**
 * Calculate real completion percentage for each pillar
 * Returns { pillarId: { checks: [{label, done}], pct, filled, total } }
 */
export async function calculateCompletion() {
  const [
    { data: members },
    { data: vision },
    { data: decisions },
    { data: tasks },
    { data: resources },
    { data: files },
    { data: docs },
    { data: retro },
    { data: kpis },
    { data: competitors },
  ] = await Promise.all([
    supabase.from("cockpit_members").select("*").in("status", ["active", "invited"]),
    supabase.from("cockpit_vision").select("topic, title, body"),
    supabase.from("cockpit_decisions").select("status"),
    supabase.from("cockpit_tasks").select("status, builder"),
    supabase.from("cockpit_resources").select("category"),
    supabase.from("cockpit_files").select("pillar"),
    supabase.from("cockpit_docs").select("id"),
    supabase.from("cockpit_retro").select("id"),
    supabase.from("cockpit_kpis").select("id"),
    supabase.from("cockpit_resources").select("id").eq("category", "competitor"),
  ]);

  const m = members || [];
  const v = vision || [];
  const d = decisions || [];
  const t = tasks || [];
  const r = resources || [];
  const f = files || [];

  const profileFields = ["bio", "phone", "linkedin", "timezone", "languages", "skills", "urls", "availability", "telegram_chat_id"];

  // WHY pillar
  const whyTopics = ["product", "market", "tech", "pitch", "monetization", "growth"];
  const whyChecks = [
    ...whyTopics.map((topic) => ({
      label: `${topic.charAt(0).toUpperCase() + topic.slice(1)} strategy defined`,
      done: v.some((x) => x.topic === topic && x.body && x.body.length > 10),
    })),
    { label: "At least 1 decision resolved", done: d.some((x) => x.status === "decided") },
    { label: "At least 3 decisions created", done: d.length >= 3 },
  ];

  // TEAM pillar
  const teamChecks = [];
  m.forEach((member) => {
    profileFields.forEach((field) => {
      const val = member[field];
      const filled = val && val !== "[]" && (!Array.isArray(val) || val.length > 0);
      teamChecks.push({
        label: `${member.name}: ${field.replace(/_/g, " ")}`,
        done: !!filled,
      });
    });
  });
  if (teamChecks.length === 0) {
    teamChecks.push({ label: "Add team members", done: false });
  }

  // RESOURCES pillar
  const expectedCategories = ["drive", "design", "reference", "competitor", "tool", "api_doc", "tutorial", "inspiration"];
  const resourceChecks = [
    ...expectedCategories.map((cat) => ({
      label: `${cat.replace(/_/g, " ")} resources added`,
      done: r.some((x) => x.category === cat),
    })),
    { label: "Files uploaded", done: f.length > 0 },
    { label: "10+ resources total", done: r.length >= 10 },
  ];

  // PROJECT pillar
  const projectChecks = [
    { label: "10+ tasks created", done: t.length >= 10 },
    { label: "Tasks assigned to all builders", done: new Set(t.map((x) => x.builder)).size >= (m.length || 1) },
    { label: "Some tasks in progress", done: t.some((x) => x.status === "in_progress") },
    { label: "Some tasks done", done: t.some((x) => x.status === "done") },
    { label: "50%+ tasks completed", done: t.length > 0 && t.filter((x) => x.status === "done").length >= t.length * 0.5 },
    { label: "Documentation imported", done: (docs || []).length > 0 },
    { label: "5+ doc chapters", done: (docs || []).length >= 5 },
    { label: "Retrospective done", done: (retro || []).length > 0 },
    { label: "3+ retro items", done: (retro || []).length >= 3 },
  ];

  // MARKET pillar
  const marketChecks = [
    { label: "Market analysis written", done: v.some((x) => x.topic === "market" && x.body?.length > 50) },
    { label: "Competitors identified", done: (competitors || []).length > 0 },
    { label: "3+ competitors listed", done: (competitors || []).length >= 3 },
    { label: "User feedback collected", done: v.some((x) => x.topic === "growth") },
    { label: "Growth strategy defined", done: v.some((x) => x.topic === "growth" && x.body?.length > 50) },
  ];

  // FINANCES pillar
  const financeChecks = [
    { label: "Budget items added", done: r.some((x) => x.category === "admin") },
    { label: "Revenue targets defined", done: (kpis || []).length > 0 },
    { label: "Cost projections reviewed", done: v.some((x) => x.topic === "monetization") },
  ];

  // ANALYTICS pillar
  const analyticsChecks = [
    { label: "First KPI entry logged", done: (kpis || []).length > 0 },
    { label: "3+ KPI entries", done: (kpis || []).length >= 3 },
    { label: "All tasks have status", done: t.length > 0 && t.every((x) => x.status) },
  ];

  function calc(checks) {
    const filled = checks.filter((c) => c.done).length;
    const total = checks.length;
    return { checks, filled, total, pct: total > 0 ? Math.round((filled / total) * 100) : 0 };
  }

  return {
    why: calc(whyChecks),
    team: calc(teamChecks),
    resources: calc(resourceChecks),
    project: calc(projectChecks),
    market: calc(marketChecks),
    finances: calc(financeChecks),
    analytics: calc(analyticsChecks),
  };
}
