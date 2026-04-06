"use client";

import { useState, useEffect } from "react";
import { supabase, SPRINTS } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import Card from "@/app/components/Card";
import Link from "next/link";

const PILLARS = [
  {
    id: "why", label: "Why", color: "#3b82f6", href: "/pourquoi/mission",
    checks: [
      { label: "Mission defined", key: "vision_product" },
      { label: "Market identified", key: "vision_market" },
      { label: "First decision resolved", key: "decision_resolved" },
      { label: "Strategy notes added", key: "vision_any" },
    ],
  },
  {
    id: "team", label: "Team", color: "#8b5cf6", href: "/equipe/members",
    checks: [
      { label: "2+ members", key: "members_2" },
      { label: "All members logged in", key: "members_all_active" },
      { label: "Roles assigned", key: "members_roles" },
      { label: "Profiles completed", key: "members_profiles" },
    ],
  },
  {
    id: "resources", label: "Resources", color: "#10b981", href: "/ressources/links",
    checks: [
      { label: "3+ links added", key: "resources_3" },
      { label: "Files uploaded", key: "files_any" },
      { label: "Tools documented", key: "resources_tools" },
    ],
  },
  {
    id: "project", label: "Project", color: "#f59e0b", href: "/projet/overview",
    checks: [
      { label: "5+ tasks created", key: "tasks_5" },
      { label: "Tasks in progress", key: "tasks_in_progress" },
      { label: "Documentation imported", key: "docs_any" },
      { label: "First retro done", key: "retro_any" },
    ],
  },
  {
    id: "market", label: "Market", color: "#ec4899", href: "/clients/personas",
    checks: [
      { label: "Personas defined", key: "vision_market" },
      { label: "Competitors listed", key: "competitors_any" },
      { label: "User feedback logged", key: "feedback_any" },
    ],
  },
  {
    id: "finances", label: "Finances", color: "#ef4444", href: "/finances/budget-track",
    checks: [
      { label: "Budget items added", key: "budget_any" },
      { label: "Revenue tracked", key: "kpis_any" },
    ],
  },
  {
    id: "analytics", label: "Analytics", color: "#06b6d4", href: "/analytics/kpis",
    checks: [
      { label: "KPIs logged", key: "kpis_any" },
      { label: "Alerts reviewed", key: "tasks_any" },
    ],
  },
];

export default function Home() {
  const { builder } = useAuth();
  const [checkResults, setCheckResults] = useState({});
  const [tasks, setTasks] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [
        { count: taskCount },
        { count: doneCount },
        { count: inProgressCount },
        { count: visionProductCount },
        { count: visionMarketCount },
        { count: visionAnyCount },
        { count: decisionResolvedCount },
        { count: resourceCount },
        { count: resourceToolCount },
        { count: kpiCount },
        { count: docCount },
        { count: retroCount },
        { count: competitorCount },
        { count: feedbackCount },
        { count: fileCount },
        { data: memberData },
        { data: taskData },
        { data: activityData },
      ] = await Promise.all([
        supabase.from("cockpit_tasks").select("*", { count: "exact", head: true }),
        supabase.from("cockpit_tasks").select("*", { count: "exact", head: true }).eq("status", "done"),
        supabase.from("cockpit_tasks").select("*", { count: "exact", head: true }).eq("status", "in_progress"),
        supabase.from("cockpit_vision").select("*", { count: "exact", head: true }).eq("topic", "product"),
        supabase.from("cockpit_vision").select("*", { count: "exact", head: true }).eq("topic", "market"),
        supabase.from("cockpit_vision").select("*", { count: "exact", head: true }),
        supabase.from("cockpit_decisions").select("*", { count: "exact", head: true }).eq("status", "decided"),
        supabase.from("cockpit_resources").select("*", { count: "exact", head: true }),
        supabase.from("cockpit_resources").select("*", { count: "exact", head: true }).in("category", ["tool", "api_doc"]),
        supabase.from("cockpit_kpis").select("*", { count: "exact", head: true }),
        supabase.from("cockpit_docs").select("*", { count: "exact", head: true }),
        supabase.from("cockpit_retro").select("*", { count: "exact", head: true }),
        supabase.from("cockpit_resources").select("*", { count: "exact", head: true }).eq("category", "competitor"),
        supabase.from("cockpit_vision").select("*", { count: "exact", head: true }).eq("topic", "growth"),
        supabase.from("cockpit_files").select("*", { count: "exact", head: true }),
        supabase.from("cockpit_members").select("name, builder, status, user_id, bio").in("status", ["active", "invited"]),
        supabase.from("cockpit_tasks").select("*").order("updated_at", { ascending: false }).limit(5),
        supabase.from("cockpit_activity").select("action, entity_type, entity_title, actor_name, created_at").order("created_at", { ascending: false }).limit(8),
      ]);

      const members = memberData || [];
      const results = {
        vision_product: visionProductCount > 0,
        vision_market: visionMarketCount > 0,
        vision_any: visionAnyCount > 0,
        decision_resolved: decisionResolvedCount > 0,
        members_2: members.length >= 2,
        members_all_active: members.length > 0 && members.every((m) => m.user_id),
        members_roles: members.length > 0 && members.every((m) => m.builder),
        members_profiles: members.length > 0 && members.filter((m) => m.bio).length >= Math.ceil(members.length / 2),
        resources_3: resourceCount >= 3,
        resources_tools: resourceToolCount > 0,
        files_any: fileCount > 0,
        tasks_5: taskCount >= 5,
        tasks_any: taskCount > 0,
        tasks_in_progress: inProgressCount > 0,
        docs_any: docCount > 0,
        retro_any: retroCount > 0,
        competitors_any: competitorCount > 0,
        feedback_any: feedbackCount > 0,
        budget_any: resourceCount > 0,
        kpis_any: kpiCount > 0,
        _tasksDone: doneCount,
        _tasksTotal: taskCount,
      };

      setCheckResults(results);
      setTasks(taskData || []);
      setActivity(activityData || []);
      setLoading(false);
    }
    load();
  }, []);

  const todayStr = new Date().toISOString().split("T")[0];
  const currentSprint = [...SPRINTS].reverse().find((s) => s.date <= todayStr) || SPRINTS[0];
  const nextSprint = SPRINTS.find((s) => s.date > todayStr);
  const daysUntil = nextSprint ? Math.ceil((new Date(nextSprint.date) - new Date()) / 86400000) : 0;

  // Calculate per-pillar completion
  const pillarStats = PILLARS.map((p) => {
    const passed = p.checks.filter((c) => checkResults[c.key]).length;
    const total = p.checks.length;
    const pct = total > 0 ? Math.round((passed / total) * 100) : 0;
    return { ...p, passed, total, pct };
  });

  const overallPct = pillarStats.length > 0
    ? Math.round(pillarStats.reduce((s, p) => s + p.pct, 0) / pillarStats.length)
    : 0;

  // Determine current phase
  const currentPhase = pillarStats.find((p) => p.pct < 100) || pillarStats[pillarStats.length - 1];

  const EMOJIS = { created: "🆕", updated: "✏️", completed: "✅", commented: "💬", invited: "👋", resolved: "🎯", deleted: "🗑️", responded: "🤖" };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-[#475569] text-sm font-mono">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Radar</h1>
        <p className="text-sm text-[#94a3b8] leading-relaxed max-w-2xl">
          AI-powered job monitoring — instant alerts with tailored CVs and pitches.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="text-center py-5">
          <div className="text-3xl font-extrabold" style={{ color: overallPct >= 70 ? "#10b981" : overallPct >= 40 ? "#f59e0b" : "#ef4444" }}>
            {overallPct}%
          </div>
          <div className="text-[11px] text-[#64748b] mt-1 font-mono">Overall Progress</div>
        </Card>
        <Card className="text-center py-5">
          <div className="text-3xl font-extrabold text-emerald-400">
            {checkResults._tasksDone || 0}/{checkResults._tasksTotal || 0}
          </div>
          <div className="text-[11px] text-[#64748b] mt-1 font-mono">Tasks Done</div>
        </Card>
        <Card className="text-center py-5">
          <div className="text-2xl font-extrabold text-white">{currentSprint.name.split(" — ")[0]}</div>
          <div className="text-[11px] text-[#64748b] mt-1 font-mono">{currentSprint.name.split(" — ")[1]}</div>
        </Card>
        <Card className="text-center py-5">
          <div className="text-3xl font-extrabold text-[#fcd34d]">{daysUntil > 0 ? `${daysUntil}d` : "Today!"}</div>
          <div className="text-[11px] text-[#64748b] mt-1 font-mono">Next Sprint</div>
        </Card>
      </div>

      {/* Current phase indicator */}
      {currentPhase && currentPhase.pct < 100 && (
        <div className="p-4 rounded-xl border border-dashed" style={{ borderColor: currentPhase.color + "44", background: currentPhase.color + "08" }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: currentPhase.color }} />
            <span className="text-sm font-bold text-white">Current focus: {currentPhase.label}</span>
            <span className="text-xs font-mono ml-auto" style={{ color: currentPhase.color }}>{currentPhase.pct}%</span>
          </div>
          <div className="text-xs text-[#64748b]">
            {currentPhase.checks.filter((c) => !checkResults[c.key]).map((c) => c.label).join(" · ")}
          </div>
        </div>
      )}

      {/* 7 Pillars — 3 columns */}
      <div>
        <h2 className="text-xs font-bold text-[#94a3b8] mb-4 uppercase tracking-widest">7 Pillars</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pillarStats.map((p) => (
            <Link key={p.id} href={p.href}>
              <Card className="card-hover cursor-pointer group h-full">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ background: p.color }} />
                    <span className="text-sm font-bold text-white group-hover:text-[#93c5fd] transition-colors">{p.label}</span>
                  </div>
                  <span className="text-lg font-extrabold" style={{ color: p.pct === 100 ? "#10b981" : p.pct >= 50 ? p.color : "#475569" }}>
                    {p.pct}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-[#1e293b] rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${p.pct}%`, background: p.pct === 100 ? "#10b981" : p.color }}
                  />
                </div>

                {/* Checklist */}
                <div className="space-y-1.5">
                  {p.checks.map((c) => {
                    const ok = checkResults[c.key];
                    return (
                      <div key={c.key} className="flex items-center gap-2">
                        <span className="text-[11px]" style={{ color: ok ? "#10b981" : "#334155" }}>
                          {ok ? "✓" : "○"}
                        </span>
                        <span className={`text-[11px] ${ok ? "text-[#64748b]" : "text-[#94a3b8]"}`}>
                          {c.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </Link>
          ))}

          {/* Config card */}
          <Link href="/setup/checklist">
            <Card className="card-hover cursor-pointer group border-dashed h-full">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-3 h-3 rounded-full bg-[#475569]" />
                <span className="text-sm font-bold text-[#64748b] group-hover:text-white transition-colors">Config</span>
              </div>
              <p className="text-[11px] text-[#475569]">Setup checklist, bot, API keys, changelog</p>
            </Card>
          </Link>
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <h2 className="text-xs font-bold text-[#94a3b8] mb-4 uppercase tracking-widest">Recent Activity</h2>
        <Card>
          {activity.length === 0 ? (
            <p className="text-[#475569] text-sm">No activity yet.</p>
          ) : (
            <div className="space-y-2">
              {activity.map((a, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-[#1e293b] last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm">{EMOJIS[a.action] || "📌"}</span>
                    <span className="text-xs text-white font-medium">{a.actor_name}</span>
                    <span className="text-xs text-[#475569]">{a.action}</span>
                    <span className="text-xs text-[#94a3b8] truncate">{a.entity_title}</span>
                  </div>
                  <span className="text-[10px] text-[#334155] font-mono whitespace-nowrap ml-2">
                    {new Date(a.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
