"use client";

// This file redirects to the (app) route group home page
// The actual home dashboard is in app/(app)/page.js

import { useState, useEffect } from "react";
import { supabase, BUILDERS, SPRINTS } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const BUILDER_LIST = Object.values(BUILDERS);

const PILLARS = [
  { id: "pourquoi", label: "Pourquoi", color: "#3b82f6", href: "/pourquoi/mission", desc: "Mission, Vision, Decisions" },
  { id: "equipe", label: "Équipe", color: "#8b5cf6", href: "/equipe/members", desc: "Members, Roles, Skills" },
  { id: "ressources", label: "Ressources", color: "#10b981", href: "/ressources/links", desc: "Links, Tools, Budget" },
  { id: "projet", label: "Projet", color: "#f59e0b", href: "/projet/overview", desc: "Board, Roadmap, Retro, Docs" },
  { id: "clients", label: "Clients & Marché", color: "#ec4899", href: "/clients/personas", desc: "Personas, Competitors, Feedback" },
  { id: "finances", label: "Finances", color: "#ef4444", href: "/finances/budget-track", desc: "Budget, Costs, Revenue" },
  { id: "analytics", label: "Analytics", color: "#06b6d4", href: "/analytics/kpis", desc: "KPIs, Alerts, Health" },
];

export default function Home() {
  const { builder } = useAuth();
  const [counts, setCounts] = useState({});
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [
        { count: taskCount },
        { count: doneCount },
        { count: decisionCount },
        { count: visionCount },
        { count: resourceCount },
        { count: kpiCount },
        { count: docCount },
        { data: taskData },
      ] = await Promise.all([
        supabase.from("cockpit_tasks").select("*", { count: "exact", head: true }),
        supabase.from("cockpit_tasks").select("*", { count: "exact", head: true }).eq("status", "done"),
        supabase.from("cockpit_decisions").select("*", { count: "exact", head: true }),
        supabase.from("cockpit_vision").select("*", { count: "exact", head: true }),
        supabase.from("cockpit_resources").select("*", { count: "exact", head: true }),
        supabase.from("cockpit_kpis").select("*", { count: "exact", head: true }),
        supabase.from("cockpit_docs").select("*", { count: "exact", head: true }),
        supabase.from("cockpit_tasks").select("*").order("updated_at", { ascending: false }).limit(5),
      ]);
      setCounts({
        tasks: taskCount || 0,
        done: doneCount || 0,
        decisions: decisionCount || 0,
        vision: visionCount || 0,
        resources: resourceCount || 0,
        kpis: kpiCount || 0,
        docs: docCount || 0,
      });
      setTasks(taskData || []);
      setLoading(false);
    }
    load();
  }, []);

  const todayStr = new Date().toISOString().split("T")[0];
  const currentSprint = [...SPRINTS].reverse().find((s) => s.date <= todayStr) || SPRINTS[0];
  const nextSprint = SPRINTS.find((s) => s.date > todayStr);
  const daysUntil = nextSprint ? Math.ceil((new Date(nextSprint.date) - new Date()) / 86400000) : 0;

  const filledPillars = [
    counts.vision > 0,
    true, // equipe always has builders
    counts.resources > 0,
    counts.tasks > 0,
    false, // clients - check later
    false, // finances
    counts.kpis > 0,
  ].filter(Boolean).length;
  const healthPct = Math.round((filledPillars / 7) * 100);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-[#475569] text-sm font-mono">Loading...</div>;
  }

  return (
    <div>
      {/* Vision header */}
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-white mb-2">Radar</h1>
        <p className="text-[14px] text-[#94a3b8] leading-relaxed max-w-2xl">
          Radar monitors every job platform you care about and the moment a matching opportunity appears,
          it sends you an instant alert with a tailored CV and pitch — before most applicants even open their laptop.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <Card className="text-center">
          <div className="text-2xl font-extrabold" style={{ color: healthPct >= 70 ? "#6ee7b7" : healthPct >= 40 ? "#fcd34d" : "#94a3b8" }}>
            {healthPct}%
          </div>
          <div className="text-[11px] text-[#64748b] mt-1">Project Health</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-extrabold text-[#6ee7b7]">{counts.done}/{counts.tasks}</div>
          <div className="text-[11px] text-[#64748b] mt-1">Tasks Done</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-extrabold text-white">{currentSprint.name.split(" — ")[0]}</div>
          <div className="text-[11px] text-[#64748b] mt-1">{currentSprint.name.split(" — ")[1]}</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-extrabold text-[#fcd34d]">{daysUntil > 0 ? `${daysUntil}d` : "Today!"}</div>
          <div className="text-[11px] text-[#64748b] mt-1">Next Sprint</div>
        </Card>
      </div>

      {/* 7 Pillars */}
      <h2 className="text-sm font-bold text-[#94a3b8] mb-3 uppercase tracking-wider">7 Pillars</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {PILLARS.map((p) => (
          <a key={p.id} href={p.href}>
            <Card className="hover:border-[#334155] transition-colors cursor-pointer group">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                <span className="text-[14px] font-bold text-white group-hover:text-[#93c5fd] transition-colors">{p.label}</span>
              </div>
              <p className="text-[11px] text-[#475569]">{p.desc}</p>
            </Card>
          </a>
        ))}
        <a href="/setup">
          <Card className="hover:border-[#334155] transition-colors cursor-pointer group border-dashed">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#475569]" />
              <span className="text-[14px] font-bold text-[#64748b] group-hover:text-white transition-colors">Setup</span>
            </div>
            <p className="text-[11px] text-[#475569]">Checklist & Config</p>
          </Card>
        </a>
      </div>

      {/* Recent activity */}
      <h2 className="text-sm font-bold text-[#94a3b8] mb-3 uppercase tracking-wider">Recent Activity</h2>
      <Card>
        {tasks.length === 0 ? (
          <p className="text-[#475569] text-sm">No recent activity.</p>
        ) : (
          <div className="space-y-2">
            {tasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-1.5 border-b border-[#1e293b] last:border-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    t.status === "done" ? "bg-emerald-500/10 text-emerald-400" :
                    t.status === "in_progress" ? "bg-blue-500/10 text-blue-400" :
                    "bg-slate-500/10 text-slate-400"
                  }`}>{t.status}</span>
                  <span className="text-[13px] text-white">{t.title}</span>
                </div>
                <span className="text-[10px] text-[#475569] font-mono">{t.task_ref}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
