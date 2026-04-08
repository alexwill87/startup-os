"use client";

import { useState, useEffect } from "react";
import { supabase, SPRINTS } from "@/lib/supabase";
import { calculateCompletion } from "@/lib/completion";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const COLOR = "#f59e0b";

const JALONS = [
  {
    id: "J1", title: "Foundation", status: "done",
    desc: "Infrastructure: Supabase, Auth, Deploy, Bot, 53 routes",
    items: ["Supabase project created", "Auth system (magic link)", "Vercel deployment", "Telegram bot connected", "53 routes live", "13 tables created"],
  },
  {
    id: "J2", title: "Structure", status: "done",
    desc: "76 checklist items, pillar dashboards, completion %, activity feed",
    items: ["76 checklist items seeded", "PillarDashboard component", "Real completion %", "Activity feed", "File uploads + gallery", "API Keys vault"],
  },
  {
    id: "J3", title: "Connection", status: "in_progress",
    desc: "Connect sub-pages to checklist. Project pillar as orchestrator.",
    items: ["Project Overview = cross-pillar dashboard", "Board linked to checklist actions", "Docs linked to checklist documents", "Auto-check when content filled", "Roadmap with jalons + sprints"],
  },
  {
    id: "J4", title: "Intelligence", status: "planned",
    desc: "Bot writes data, daily summary, mentions, notifications per pillar",
    items: ["Bot creates/updates checklist items", "Daily summary cron", "@mentions in comments", "Per-pillar notifications", "Mentor role with validation"],
  },
  {
    id: "J5", title: "Polish & Launch", status: "planned",
    desc: "View modes, export, CSS final, open-source launch",
    items: ["Table/gallery view modes", "Export to PDF", "CSS polish", "Open-source README", "Custom themes", "Multi-project support"],
  },
];

const JALON_COLORS = {
  done: "#10b981",
  in_progress: "#f59e0b",
  planned: "#334155",
};

const STATUS_DOTS = {
  todo: "#64748b",
  in_progress: "#3b82f6",
  done: "#10b981",
  blocked: "#ef4444",
};

export default function RoadmapPage() {
  const [tasks, setTasks] = useState([]);
  const [completion, setCompletion] = useState(null);
  const [expandedSprint, setExpandedSprint] = useState(null);
  const [loading, setLoading] = useState(true);

  const todayStr = new Date().toISOString().split("T")[0];
  const currentSprint = [...SPRINTS].reverse().find((s) => s.date <= todayStr) || SPRINTS[0];

  useEffect(() => {
    async function load() {
      const [{ data: taskData }, comp] = await Promise.all([
        supabase.from("cockpit_tasks").select("title, status, builder, sprint, task_ref").order("sort_order", { ascending: true }),
        calculateCompletion(),
      ]);
      setTasks(taskData || []);
      setCompletion(comp);
      setExpandedSprint(currentSprint.id);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-[#475569] text-sm font-mono">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Roadmap" subtitle="Super-jalons + sprint timeline" color={COLOR} />

      {/* Super-Jalons */}
      <div>
        <h2 className="text-xs font-bold text-[#94a3b8] mb-4 uppercase tracking-widest">Project Milestones</h2>
        <div className="space-y-1">
          {JALONS.map((j, idx) => {
            const jColor = JALON_COLORS[j.status];
            const isLast = idx === JALONS.length - 1;
            return (
              <div key={j.id} className="flex gap-4">
                {/* Timeline */}
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border-2 flex-shrink-0"
                    style={{ borderColor: jColor, color: jColor, background: j.status === "done" ? jColor + "22" : "transparent" }}>
                    {j.status === "done" ? "✓" : j.id}
                  </div>
                  {!isLast && <div className="w-0.5 flex-1 min-h-[20px]" style={{ background: jColor + "44" }} />}
                </div>

                {/* Content */}
                <Card className={`flex-1 mb-3 ${j.status === "planned" ? "opacity-50" : ""}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-white">{j.id} — {j.title}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                      style={{ background: jColor + "22", color: jColor }}>
                      {j.status === "done" ? "DONE" : j.status === "in_progress" ? "CURRENT" : "PLANNED"}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748b] mb-2">{j.desc}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {j.items.map((item, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className="text-[10px]" style={{ color: j.status === "done" ? "#10b981" : "#334155" }}>
                          {j.status === "done" ? "✓" : "○"}
                        </span>
                        <span className="text-[10px] text-[#94a3b8]">{item}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sprint Timeline */}
      <div>
        <h2 className="text-xs font-bold text-[#94a3b8] mb-4 uppercase tracking-widest">Sprint Timeline</h2>
        <div className="space-y-3">
          {SPRINTS.map((sprint) => {
            const sprintTasks = tasks.filter((t) => t.sprint === sprint.id);
            const done = sprintTasks.filter((t) => t.status === "done").length;
            const pct = sprintTasks.length > 0 ? Math.round((done / sprintTasks.length) * 100) : 0;
            const isCurrent = sprint.id === currentSprint.id;
            const isPast = sprint.date < todayStr;
            const isExpanded = expandedSprint === sprint.id;

            return (
              <div key={sprint.id}>
                <div
                  onClick={() => setExpandedSprint(isExpanded ? null : sprint.id)}
                  className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                    isCurrent ? "border-[#f59e0b]/30 bg-[#f59e0b]/5" : "border-[#1e293b] bg-[#0d1117] hover:border-[#334155]"
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isCurrent ? "animate-pulse" : ""}`}
                    style={{ background: isPast ? "#10b981" : isCurrent ? "#f59e0b" : "#334155" }} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{sprint.name}</span>
                      {isCurrent && <span className="text-[9px] font-mono text-[#f59e0b]">CURRENT</span>}
                    </div>
                    <span className="text-[10px] text-[#475569] font-mono">{sprint.date}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold" style={{ color: pct === 100 ? "#10b981" : pct > 0 ? "#f59e0b" : "#334155" }}>
                      {pct}%
                    </span>
                    <span className="text-[10px] text-[#475569] font-mono ml-1">{done}/{sprintTasks.length}</span>
                  </div>
                  <span className="text-[#475569] text-xs">{isExpanded ? "−" : "+"}</span>
                </div>

                {isExpanded && sprintTasks.length > 0 && (
                  <div className="ml-6 mt-2 space-y-1 pb-2">
                    {sprintTasks.map((t, i) => (
                      <div key={i} className="flex items-center gap-2 py-1">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STATUS_DOTS[t.status] || "#64748b" }} />
                        <span className="text-[11px] text-[#94a3b8]">{t.task_ref && <span className="text-[#475569] font-mono mr-1">{t.task_ref}</span>}{t.title}</span>
                        <span className="text-[9px] text-[#334155] font-mono ml-auto">{t.builder}</span>
                      </div>
                    ))}
                  </div>
                )}

                {isExpanded && sprintTasks.length === 0 && (
                  <div className="ml-6 mt-2 pb-2">
                    <p className="text-[11px] text-[#475569]">No tasks for this sprint yet.</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Pillar completion radar */}
      {completion && (
        <Card>
          <h3 className="text-sm font-bold text-white mb-4">Pillar Readiness</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {PILLAR_META.map((p) => {
              const data = completion[p.id] || { pct: 0, done: 0, required: 0 };
              return (
                <div key={p.id} className="text-center">
                  <div className="text-xl font-extrabold" style={{ color: data.pct === 100 ? "#10b981" : data.pct > 0 ? p.color : "#334155" }}>
                    {data.pct}%
                  </div>
                  <div className="text-[10px] text-[#64748b] mt-0.5">{p.label}</div>
                  <div className="h-1 bg-[#1e293b] rounded-full mt-1 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${data.pct}%`, background: p.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

const PILLAR_META = [
  { id: "why", label: "Why", color: "#3b82f6" },
  { id: "team", label: "Team", color: "#8b5cf6" },
  { id: "resources", label: "Resources", color: "#10b981" },
  { id: "project", label: "Project", color: "#f59e0b" },
  { id: "market", label: "Market", color: "#ec4899" },
  { id: "finances", label: "Finances", color: "#ef4444" },
  { id: "analytics", label: "Analytics", color: "#06b6d4" },
];
