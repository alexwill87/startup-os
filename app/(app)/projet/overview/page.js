"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase, SPRINTS } from "@/lib/supabase";
import { calculateCompletion } from "@/lib/completion";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const COLOR = "#f59e0b";

const PILLAR_META = [
  { id: "why", label: "Why", color: "#3b82f6", href: "/pourquoi" },
  { id: "team", label: "Team", color: "#8b5cf6", href: "/equipe" },
  { id: "resources", label: "Resources", color: "#10b981", href: "/ressources" },
  { id: "project", label: "Project", color: "#f59e0b", href: "/projet" },
  { id: "market", label: "Market", color: "#ec4899", href: "/clients" },
  { id: "finances", label: "Finances", color: "#ef4444", href: "/finances" },
  { id: "analytics", label: "Analytics", color: "#06b6d4", href: "/analytics" },
];

export default function OverviewPage() {
  const [completion, setCompletion] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  const todayStr = new Date().toISOString().split("T")[0];
  const currentSprint = [...SPRINTS].reverse().find((s) => s.date <= todayStr) || SPRINTS[0];
  const nextSprint = SPRINTS.find((s) => s.date > todayStr);
  const daysUntil = nextSprint ? Math.ceil((new Date(nextSprint.date) - new Date()) / 86400000) : 0;

  useEffect(() => {
    async function load() {
      const [comp, { data: taskData }, { data: memberData }, { data: decData }, { data: actData }] = await Promise.all([
        calculateCompletion(),
        supabase.from("cockpit_tasks").select("*").order("updated_at", { ascending: false }),
        supabase.from("cockpit_members").select("name, builder, color, status").eq("status", "active"),
        supabase.from("cockpit_decisions").select("title, status").order("created_at", { ascending: false }).limit(5),
        supabase.from("cockpit_activity").select("action, entity_type, entity_title, actor_name, created_at").order("created_at", { ascending: false }).limit(10),
      ]);
      setCompletion(comp);
      setTasks(taskData || []);
      setMembers(memberData || []);
      setDecisions(decData || []);
      setActivity(actData || []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading || !completion) {
    return <div className="flex items-center justify-center h-64 text-[#475569] text-sm font-mono">Loading...</div>;
  }

  const pillars = PILLAR_META.map((p) => ({ ...p, ...completion[p.id] }));
  const overallPct = Math.round(pillars.reduce((s, p) => s + p.pct, 0) / pillars.length);
  const totalChecks = pillars.reduce((s, p) => s + (p.required || 0), 0);
  const totalDone = pillars.reduce((s, p) => s + (p.done || 0), 0);

  const sprintTasks = tasks.filter((t) => t.sprint === currentSprint.id);
  const tasksDone = sprintTasks.filter((t) => t.status === "done").length;
  const tasksBlocked = sprintTasks.filter((t) => t.status === "blocked").length;
  const tasksPct = sprintTasks.length > 0 ? Math.round((tasksDone / sprintTasks.length) * 100) : 0;

  const openDecisions = (decisions || []).filter((d) => d.status === "open").length;

  // Builder stats
  const builderStats = (members || []).map((m) => {
    const bt = sprintTasks.filter((t) => t.builder === m.builder);
    const bd = bt.filter((t) => t.status === "done").length;
    return { ...m, tasks: bt.length, done: bd, pct: bt.length > 0 ? Math.round((bd / bt.length) * 100) : 0 };
  });

  const EMOJIS = { created: "🆕", updated: "✏️", completed: "✅", commented: "💬", invited: "👋", resolved: "🎯", deleted: "🗑️", responded: "🤖" };

  return (
    <div className="space-y-8">
      <PageHeader title="Project Overview" subtitle="Cross-pillar dashboard — everything at a glance" color={COLOR} />

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="text-center py-4">
          <div className="text-2xl font-extrabold" style={{ color: overallPct >= 50 ? "#10b981" : overallPct > 0 ? "#f59e0b" : "#ef4444" }}>
            {overallPct}%
          </div>
          <div className="text-[10px] text-[#64748b] font-mono mt-1">{totalDone}/{totalChecks} checks</div>
          <div className="text-[10px] text-[#475569] mt-0.5">Overall</div>
        </Card>
        <Card className="text-center py-4">
          <div className="text-2xl font-extrabold text-[#f59e0b]">{tasksPct}%</div>
          <div className="text-[10px] text-[#64748b] font-mono mt-1">{tasksDone}/{sprintTasks.length} tasks</div>
          <div className="text-[10px] text-[#475569] mt-0.5">{currentSprint.name.split(" — ")[0]}</div>
        </Card>
        <Card className="text-center py-4">
          <div className="text-2xl font-extrabold" style={{ color: tasksBlocked > 0 ? "#ef4444" : "#64748b" }}>{tasksBlocked}</div>
          <div className="text-[10px] text-[#475569] mt-1">Blocked</div>
        </Card>
        <Card className="text-center py-4">
          <div className="text-2xl font-extrabold text-[#3b82f6]">{openDecisions}</div>
          <div className="text-[10px] text-[#475569] mt-1">Open Decisions</div>
        </Card>
        <Card className="text-center py-4">
          <div className="text-2xl font-extrabold text-[#fcd34d]">{daysUntil > 0 ? `${daysUntil}d` : "Today!"}</div>
          <div className="text-[10px] text-[#475569] mt-1">Next Sprint</div>
        </Card>
      </div>

      {/* Pillar progress bars */}
      <Card>
        <h3 className="text-sm font-bold text-white mb-4">Pillar Completion</h3>
        <div className="space-y-3">
          {pillars.map((p) => (
            <Link key={p.id} href={p.href} className="block group">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
                <span className="text-xs text-[#94a3b8] w-20 group-hover:text-white transition-colors">{p.label}</span>
                <div className="flex-1 h-2 bg-[#1e293b] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${p.pct}%`, background: p.pct === 100 ? "#10b981" : p.color }} />
                </div>
                <span className="text-xs font-mono w-16 text-right" style={{ color: p.pct === 100 ? "#10b981" : p.pct > 0 ? p.color : "#334155" }}>
                  {p.done || 0}/{p.required || 0}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </Card>

      {/* Two columns: Builders + Decisions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Builder progress */}
        <Card>
          <h3 className="text-sm font-bold text-white mb-4">Team — {currentSprint.name.split(" — ")[0]}</h3>
          {builderStats.length === 0 ? (
            <p className="text-[#475569] text-sm">No team members.</p>
          ) : (
            <div className="space-y-3">
              {builderStats.map((b) => (
                <div key={b.name} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                    style={{ background: (b.color || "#3b82f6") + "22", color: b.color || "#3b82f6" }}>
                    {b.builder || "?"}
                  </div>
                  <span className="text-xs text-white w-20">{b.name}</span>
                  <div className="flex-1 h-1.5 bg-[#1e293b] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${b.pct}%`, background: b.color || "#3b82f6" }} />
                  </div>
                  <span className="text-[10px] text-[#64748b] font-mono w-12 text-right">{b.done}/{b.tasks}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Open decisions */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">Recent Decisions</h3>
            <Link href="/pourquoi/decisions" className="text-[10px] text-[#3b82f6] font-mono hover:underline">View all</Link>
          </div>
          {(decisions || []).length === 0 ? (
            <p className="text-[#475569] text-sm">No decisions yet.</p>
          ) : (
            <div className="space-y-2">
              {(decisions || []).map((d, i) => (
                <div key={i} className="flex items-center gap-2 py-1.5">
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    d.status === "open" ? "bg-blue-500/10 text-blue-400" : "bg-emerald-500/10 text-emerald-400"
                  }`}>{d.status}</span>
                  <span className="text-xs text-[#94a3b8] truncate">{d.title}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Quick links */}
      <Card>
        <h3 className="text-sm font-bold text-white mb-3">Quick Access</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Board", href: "/projet/board" },
            { label: "Roadmap", href: "/projet/roadmap" },
            { label: "Docs", href: "/projet/docs" },
            { label: "Retro", href: "/projet/retro" },
            { label: "Activity", href: "/activity" },
            { label: "Checklist", href: "/setup/checklist" },
            { label: "Bot", href: "/setup/bot" },
          ].map((link) => (
            <Link key={link.href} href={link.href}
              className="px-3 py-2 rounded-lg border border-[#1e293b] bg-[#0d1117] text-xs text-[#94a3b8] hover:text-white hover:border-[#334155] transition-colors font-mono">
              {link.label}
            </Link>
          ))}
        </div>
      </Card>

      {/* Recent activity */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">Recent Activity</h3>
          <Link href="/activity" className="text-[10px] text-[#3b82f6] font-mono hover:underline">View all</Link>
        </div>
        {(activity || []).length === 0 ? (
          <p className="text-[#475569] text-sm">No activity yet.</p>
        ) : (
          <div className="space-y-1.5">
            {(activity || []).map((a, i) => (
              <div key={i} className="flex items-center justify-between py-1 border-b border-[#1e293b]/50 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm flex-shrink-0">{EMOJIS[a.action] || "📌"}</span>
                  <span className="text-[11px] text-white">{a.actor_name}</span>
                  <span className="text-[11px] text-[#475569]">{a.action}</span>
                  <span className="text-[11px] text-[#94a3b8] truncate">{a.entity_title}</span>
                </div>
                <span className="text-[9px] text-[#334155] font-mono whitespace-nowrap ml-2">
                  {new Date(a.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
