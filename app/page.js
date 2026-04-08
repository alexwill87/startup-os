"use client";

import { useState, useEffect } from "react";
import { supabase, SPRINTS } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import { calculateCompletion } from "@/lib/completion";
import { syncChecklist } from "@/lib/sync-checklist";
import Card from "@/app/components/Card";
import Link from "next/link";

const PILLAR_META = [
  { id: "why", label: "Why", color: "#3b82f6", href: "/pourquoi/mission",
    subpages: [{ label: "Vision", href: "/pourquoi/mission" }, { label: "Notes", href: "/pourquoi/vision-strategy" }, { label: "Decisions", href: "/pourquoi/decisions" }] },
  { id: "team", label: "Team", color: "#8b5cf6", href: "/equipe/members",
    subpages: [{ label: "Members", href: "/equipe/members" }, { label: "Roles", href: "/equipe/roles" }, { label: "My Profile", href: "/equipe/profile" }] },
  { id: "resources", label: "Resources", color: "#10b981", href: "/ressources/links",
    subpages: [{ label: "Links", href: "/ressources/links" }, { label: "Files", href: "/ressources/files" }, { label: "Gallery", href: "/ressources/gallery" }, { label: "Tools", href: "/ressources/tools" }] },
  { id: "project", label: "Project", color: "#f59e0b", href: "/projet/overview",
    subpages: [{ label: "Overview", href: "/projet/overview" }, { label: "Board", href: "/projet/board" }, { label: "Roadmap", href: "/projet/roadmap" }, { label: "Docs", href: "/projet/docs" }, { label: "Retro", href: "/projet/retro" }] },
  { id: "market", label: "Market", color: "#ec4899", href: "/clients/personas",
    subpages: [{ label: "Personas", href: "/clients/personas" }, { label: "Competitors", href: "/clients/competitors" }, { label: "Feedback", href: "/clients/feedback" }] },
  { id: "finances", label: "Finances", color: "#ef4444", href: "/finances/budget-track",
    subpages: [{ label: "Budget", href: "/finances/budget-track" }, { label: "Costs", href: "/finances/costs" }, { label: "Revenue", href: "/finances/revenue" }] },
  { id: "analytics", label: "Analytics", color: "#06b6d4", href: "/analytics/kpis",
    subpages: [{ label: "KPIs", href: "/analytics/kpis" }, { label: "Alerts", href: "/analytics/alerts" }, { label: "Health", href: "/analytics/health" }] },
];

const EMOJIS = { created: "🆕", updated: "✏️", completed: "✅", commented: "💬", invited: "👋", resolved: "🎯", deleted: "🗑️", responded: "🤖" };

export default function Home() {
  const { builder } = useAuth();
  const [completion, setCompletion] = useState(null);
  const [taskStats, setTaskStats] = useState({ done: 0, total: 0 });
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(null);

  useEffect(() => {
    async function load() {
      // Sync checklist with actual content before calculating
      await syncChecklist();
      const [comp, { count: taskTotal }, { count: taskDone }, { data: actData }] = await Promise.all([
        calculateCompletion(),
        supabase.from("cockpit_tasks").select("*", { count: "exact", head: true }),
        supabase.from("cockpit_tasks").select("*", { count: "exact", head: true }).eq("status", "done"),
        supabase.from("cockpit_activity").select("action, entity_type, entity_title, actor_name, created_at").order("created_at", { ascending: false }).limit(8),
      ]);
      setCompletion(comp);
      setTaskStats({ done: taskDone || 0, total: taskTotal || 0 });
      setActivity(actData || []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading || !completion) {
    return <div className="flex items-center justify-center h-64 text-[#475569] text-sm font-mono">Calculating...</div>;
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const currentSprint = [...SPRINTS].reverse().find((s) => s.date <= todayStr) || SPRINTS[0];
  const nextSprint = SPRINTS.find((s) => s.date > todayStr);
  const daysUntil = nextSprint ? Math.ceil((new Date(nextSprint.date) - new Date()) / 86400000) : 0;

  const pillars = PILLAR_META.map((p) => ({ ...p, ...completion[p.id] }));
  const overallPct = Math.round(pillars.reduce((s, p) => s + p.pct, 0) / pillars.length);
  const totalChecks = pillars.reduce((s, p) => s + p.required || p.total, 0);
  const totalFilled = pillars.reduce((s, p) => s + p.done, 0);

  const currentPhase = pillars.find((p) => p.pct < 100);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Your Startup</h1>
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
          <div className="text-[11px] text-[#64748b] mt-1 font-mono">{totalFilled}/{totalChecks} checks passed</div>
        </Card>
        <Card className="text-center py-5">
          <div className="text-3xl font-extrabold text-emerald-400">{taskStats.done}/{taskStats.total}</div>
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

      {/* Current phase */}
      {currentPhase && (
        <div className="p-4 rounded-xl border border-dashed" style={{ borderColor: currentPhase.color + "44", background: currentPhase.color + "08" }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: currentPhase.color }} />
            <span className="text-sm font-bold text-white">Current focus: {currentPhase.label}</span>
            <span className="text-xs font-mono ml-auto" style={{ color: currentPhase.color }}>
              {currentPhase.done}/{currentPhase.required} ({currentPhase.pct}%)
            </span>
          </div>
          <p className="text-xs text-[#64748b]">
            {(currentPhase.items || []).filter((i) => i.status === "todo" && i.required).slice(0, 3).map((i) => i.title).join(" · ")}
            {(currentPhase.items || []).filter((i) => i.status === "todo" && i.required).length > 3 && ` · +${(currentPhase.items || []).filter((i) => i.status === "todo" && i.required).length - 3} more`}
          </p>
        </div>
      )}

      {/* 7 Pillars */}
      <div>
        <h2 className="text-xs font-bold text-[#94a3b8] mb-4 uppercase tracking-widest">7 Pillars — {totalFilled}/{totalChecks} completed</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pillars.map((p) => {
            const todoItems = (p.items || []).filter((i) => i.status === "todo" && i.required);
            const doneItems = (p.items || []).filter((i) => i.status === "done" || i.status === "validated");
            return (
            <div key={p.id}>
              <Card className="h-full">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <Link href={p.href} className="flex items-center gap-2 group">
                    <span className="w-3 h-3 rounded-full" style={{ background: p.color }} />
                    <span className="text-sm font-bold text-white group-hover:text-[#93c5fd] transition-colors">{p.label}</span>
                  </Link>
                  <div className="text-right">
                    <span className="text-lg font-extrabold" style={{ color: p.pct === 100 ? "#10b981" : p.pct > 0 ? p.color : "#334155" }}>
                      {p.pct}%
                    </span>
                    <span className="text-[10px] text-[#475569] font-mono ml-1">{p.done}/{p.required}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-[#1e293b] rounded-full overflow-hidden mb-3">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${p.pct}%`, background: p.pct === 100 ? "#10b981" : p.color }} />
                </div>

                {/* Sub-pages */}
                {p.subpages && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {p.subpages.map((sp) => (
                      <Link key={sp.href} href={sp.href} className="text-[10px] px-2 py-1 rounded bg-[#1e293b] text-[#64748b] hover:text-white hover:bg-[#334155] transition-colors font-mono">
                        {sp.label}
                      </Link>
                    ))}
                  </div>
                )}

                {/* Unchecked items */}
                <div className="space-y-1">
                  {todoItems.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <span className="text-[11px] text-[#334155]">○</span>
                      <span className="text-[11px] text-[#94a3b8]">{item.title}</span>
                      <span className="text-[9px] text-[#334155] font-mono ml-auto">{item.category}</span>
                    </div>
                  ))}
                  {todoItems.length > 3 && (
                    <div className="text-[10px] text-[#475569] font-mono pl-4">
                      +{todoItems.length - 3} more items to do
                    </div>
                  )}
                  {p.pct === 100 && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-emerald-400">✓</span>
                        <span className="text-[11px] text-emerald-400">All checks passed</span>
                      </div>
                    )}
                  </div>
                </Card>

              {/* Expand details button */}
              {p.total > 3 && (
                <button
                  onClick={() => setShowDetails(showDetails === p.id ? null : p.id)}
                  className="w-full text-[10px] text-[#475569] font-mono py-1 hover:text-[#94a3b8] transition-colors"
                >
                  {showDetails === p.id ? "Hide details" : `Show all ${p.total} items`}
                </button>
              )}

              {/* Full checklist */}
              {showDetails === p.id && (
                <div className="mt-1 p-3 rounded-lg bg-[#0a0f1a] border border-[#1e293b] space-y-1">
                  {(p.items || []).map((item) => {
                    const isDone = item.status === "done" || item.status === "validated";
                    return (
                    <div key={item.id} className="flex items-center gap-2 py-0.5">
                      <span className="text-[11px]" style={{ color: isDone ? "#10b981" : "#334155" }}>
                        {isDone ? "✓" : "○"}
                      </span>
                      <span className={`text-[11px] ${isDone ? "text-[#64748b]" : "text-[#94a3b8]"}`}>
                        {item.title}
                      </span>
                      <span className="text-[9px] text-[#334155] font-mono ml-auto">{item.category}</span>
                      {!item.required && <span className="text-[9px] text-[#334155] font-mono">opt</span>}
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
            );
          })}

          {/* Config card */}
          <Link href="/setup/checklist">
            <Card className="card-hover cursor-pointer group border-dashed h-full flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-full bg-[#475569]" />
                <span className="text-sm font-bold text-[#64748b] group-hover:text-white transition-colors">Config</span>
              </div>
              <p className="text-[11px] text-[#475569]">Bot, API Keys, Checklist, Changelog</p>
            </Card>
          </Link>
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <h2 className="text-xs font-bold text-[#94a3b8] mb-4 uppercase tracking-widest">Recent Activity</h2>
        <Card>
          {activity.length === 0 ? (
            <p className="text-[#475569] text-sm">No activity yet. Actions will appear here as the team works.</p>
          ) : (
            <div className="space-y-2">
              {activity.map((a, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-[#1e293b] last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm flex-shrink-0">{EMOJIS[a.action] || "📌"}</span>
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
