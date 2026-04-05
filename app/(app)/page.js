"use client";

import { useState, useEffect } from "react";
import { supabase, BUILDERS, SPRINTS } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";
import Link from "next/link";

const PILLARS = [
  { name: "Mission & Vision", path: "/pourquoi/mission", color: "#3b82f6", table: "cockpit_vision", icon: "compass" },
  { name: "Strategy Notes", path: "/pourquoi/vision-strategy", color: "#10b981", table: "cockpit_vision", icon: "lightbulb" },
  { name: "Decisions", path: "/pourquoi/decisions", color: "#f59e0b", table: "cockpit_decisions", icon: "scale" },
  { name: "Tasks", path: "/projet/docs", color: "#8b5cf6", table: "cockpit_tasks", icon: "check-circle" },
  { name: "KPIs", path: "/analytics", color: "#ec4899", table: "cockpit_kpis", icon: "chart-bar" },
  { name: "Resources", path: "/ressources", color: "#06b6d4", table: "cockpit_resources", icon: "folder" },
  { name: "Retro", path: "/retro", color: "#f97316", table: "cockpit_retro", icon: "refresh" },
];

const VISION_ONELINER =
  "Radar monitors every job platform you care about and the moment a matching opportunity appears, it sends you an instant alert with a tailored CV and pitch.";

function getCurrentSprint() {
  const now = new Date();
  for (let i = SPRINTS.length - 1; i >= 0; i--) {
    if (new Date(SPRINTS[i].date) <= now) return SPRINTS[i];
  }
  return SPRINTS[0];
}

function getNextSprint() {
  const now = new Date();
  for (let i = 0; i < SPRINTS.length; i++) {
    if (new Date(SPRINTS[i].date) > now) return SPRINTS[i];
  }
  return null;
}

function daysUntil(dateStr) {
  const target = new Date(dateStr);
  const now = new Date();
  const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function HomeDashboard() {
  const { user, builder } = useAuth();
  const [pillarCounts, setPillarCounts] = useState({});
  const [taskStats, setTaskStats] = useState({ done: 0, total: 0 });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentSprint = getCurrentSprint();
  const nextSprint = getNextSprint();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      // Fetch counts for each pillar table
      const tables = [...new Set(PILLARS.map((p) => p.table))];
      const countPromises = tables.map(async (table) => {
        const { count } = await supabase.from(table).select("*", { count: "exact", head: true });
        return { table, count: count || 0 };
      });
      const counts = await Promise.all(countPromises);
      const countMap = {};
      counts.forEach((c) => (countMap[c.table] = c.count));
      setPillarCounts(countMap);

      // Fetch task stats for current sprint
      const { data: tasks } = await supabase
        .from("cockpit_tasks")
        .select("status")
        .eq("sprint", currentSprint?.id || 1);
      const done = (tasks || []).filter((t) => t.status === "done").length;
      setTaskStats({ done, total: (tasks || []).length });

      // Fetch recent activity from multiple tables
      const activitySources = [
        { table: "cockpit_tasks", type: "Task" },
        { table: "cockpit_decisions", type: "Decision" },
        { table: "cockpit_vision", type: "Note" },
        { table: "cockpit_comments", type: "Comment" },
      ];
      const activityPromises = activitySources.map(async ({ table, type }) => {
        const { data } = await supabase
          .from(table)
          .select("*")
          .order("created_at", { ascending: false })
          .limit(3);
        return (data || []).map((d) => ({ ...d, _type: type, _table: table }));
      });
      const allActivity = (await Promise.all(activityPromises)).flat();
      allActivity.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setRecentActivity(allActivity.slice(0, 5));
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  const pillarsWithContent = PILLARS.filter((p) => (pillarCounts[p.table] || 0) > 0).length;
  const healthScore = PILLARS.length > 0 ? Math.round((pillarsWithContent / PILLARS.length) * 100) : 0;

  const healthColor =
    healthScore >= 80 ? "#10b981" : healthScore >= 50 ? "#f59e0b" : "#ef4444";

  function timeAgo(dateStr) {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header with vision */}
      <div className="mb-2">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Radar</h1>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Project OS
          </span>
        </div>
        <p className="text-sm text-[#94a3b8] leading-relaxed max-w-2xl">{VISION_ONELINER}</p>
        <div className="h-[2px] mt-4 rounded-full bg-gradient-to-r from-blue-500/30 via-purple-500/20 to-transparent" />
      </div>

      {/* Top metrics row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Health Score */}
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#64748b] font-medium uppercase tracking-wider mb-1">Project Health</p>
              <p className="text-3xl font-extrabold" style={{ color: healthColor }}>
                {loading ? "..." : `${healthScore}%`}
              </p>
              <p className="text-xs text-[#475569] mt-1">
                {pillarsWithContent}/{PILLARS.length} pillars active
              </p>
            </div>
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold border-2"
              style={{ borderColor: healthColor, color: healthColor }}
            >
              {loading ? "-" : healthScore}
            </div>
          </div>
        </Card>

        {/* Sprint info */}
        <Card>
          <div>
            <p className="text-xs text-[#64748b] font-medium uppercase tracking-wider mb-1">Current Sprint</p>
            <p className="text-base font-bold text-white">{currentSprint?.name || "No sprint"}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-[#94a3b8] font-mono">
                Tasks: {taskStats.done}/{taskStats.total}
              </span>
              {taskStats.total > 0 && (
                <div className="flex-1 h-1.5 bg-[#1e293b] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-purple-500 transition-all duration-500"
                    style={{ width: `${Math.round((taskStats.done / taskStats.total) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Next sprint countdown */}
        <Card>
          <div>
            <p className="text-xs text-[#64748b] font-medium uppercase tracking-wider mb-1">Next Sprint</p>
            {nextSprint ? (
              <>
                <p className="text-base font-bold text-white">{nextSprint.name}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-2xl font-extrabold text-cyan-400">{daysUntil(nextSprint.date)}</span>
                  <span className="text-xs text-[#64748b]">days remaining</span>
                </div>
              </>
            ) : (
              <p className="text-sm text-[#475569]">Final sprint in progress</p>
            )}
          </div>
        </Card>
      </div>

      {/* 7 pillar cards */}
      <div>
        <h2 className="text-sm font-bold text-[#64748b] uppercase tracking-wider mb-3">Pillars</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {PILLARS.map((pillar) => {
            const count = pillarCounts[pillar.table] || 0;
            return (
              <Link key={pillar.name} href={pillar.path}>
                <Card className="hover:border-[#334155] transition-all duration-200 cursor-pointer group h-full">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                      style={{ backgroundColor: pillar.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                        {pillar.name}
                      </h3>
                      <p className="text-xs text-[#64748b] mt-1 font-mono">
                        {loading ? "..." : `${count} item${count !== 1 ? "s" : ""}`}
                      </p>
                    </div>
                    <span className="text-[#334155] group-hover:text-[#64748b] transition-colors text-sm">
                      &rarr;
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-sm font-bold text-[#64748b] uppercase tracking-wider mb-3">Recent Activity</h2>
        <Card>
          {loading ? (
            <p className="text-sm text-[#475569] text-center py-4">Loading...</p>
          ) : recentActivity.length === 0 ? (
            <p className="text-sm text-[#475569] text-center py-4">No activity yet. Start building!</p>
          ) : (
            <div className="divide-y divide-[#1e293b]">
              {recentActivity.map((item, i) => {
                const typeColors = {
                  Task: "#8b5cf6",
                  Decision: "#f59e0b",
                  Note: "#3b82f6",
                  Comment: "#64748b",
                };
                return (
                  <div key={`${item._table}-${item.id}-${i}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <span
                      className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0"
                      style={{
                        color: typeColors[item._type],
                        backgroundColor: typeColors[item._type] + "15",
                      }}
                    >
                      {item._type}
                    </span>
                    <span className="text-sm text-[#e2e8f0] truncate flex-1">
                      {item.title || item.body || item.name || "Untitled"}
                    </span>
                    <span className="text-xs text-[#475569] font-mono shrink-0">
                      {timeAgo(item.created_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Builder roster */}
      <div>
        <h2 className="text-sm font-bold text-[#64748b] uppercase tracking-wider mb-3">Builders</h2>
        <div className="flex gap-4 flex-wrap">
          {Object.values(BUILDERS).map((b) => (
            <div key={b.role} className="flex items-center gap-2 px-3 py-2 bg-[#0d1117] border border-[#1e293b] rounded-lg">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                style={{ backgroundColor: b.color }}
              >
                {b.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{b.name}</p>
                <p className="text-[10px] text-[#64748b] font-mono">Builder {b.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
