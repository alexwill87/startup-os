"use client";

import { useState, useEffect } from "react";
import { supabase, SPRINTS } from "@/lib/supabase";
import { useAuth, useMembers } from "@/lib/AuthProvider";
import Card from "@/app/components/Card";
import Link from "next/link";

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
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function HomeDashboard() {
  const { member, canEdit, isObserver, isMentor } = useAuth();
  const members = useMembers();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const currentSprint = getCurrentSprint();
  const nextSprint = getNextSprint();
  const userRole = member?.role || "observer";

  useEffect(() => {
    fetchData();
  }, [member]);

  async function fetchData() {
    try {
      const [
        { data: tasks },
        { data: decisions },
        { data: checklist },
        { data: activity },
        { data: objectives },
        { data: feedback },
      ] = await Promise.all([
        supabase.from("cockpit_tasks").select("*").order("created_at", { ascending: false }),
        supabase.from("cockpit_decisions").select("*").order("created_at", { ascending: false }),
        supabase.from("cockpit_checklist").select("pillar, status, category, title").order("sort_order"),
        supabase.from("cockpit_activity").select("*").order("created_at", { ascending: false }).limit(10),
        supabase.from("cockpit_objectives").select("*").order("sort_order"),
        supabase.from("cockpit_feedback").select("*").order("created_at", { ascending: false }).limit(5),
      ]);
      setData({ tasks: tasks || [], decisions: decisions || [], checklist: checklist || [], activity: activity || [], objectives: objectives || [], feedback: feedback || [] });
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <p className="text-sm text-[#475569] text-center py-12">Loading dashboard...</p>
      </div>
    );
  }

  const { tasks, decisions, checklist, activity, objectives, feedback } = data || {};

  // Compute stats
  const sprintTasks = (tasks || []).filter((t) => t.sprint === (currentSprint?.id || 1));
  const myTasks = (tasks || []).filter((t) => t.builder === member?.builder);
  const mySprintTasks = sprintTasks.filter((t) => t.builder === member?.builder);
  const tasksDone = sprintTasks.filter((t) => t.status === "done").length;
  const tasksBlocked = sprintTasks.filter((t) => t.status === "blocked").length;
  const openDecisions = (decisions || []).filter((d) => d.status === "open");
  const checklistDone = (checklist || []).filter((c) => c.status === "done" || c.status === "validated").length;
  const checklistTotal = (checklist || []).length;
  const completionPct = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;
  const approvedObjectives = (objectives || []).filter((o) => o.status === "approved" || o.status === "completed").length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-2">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Radar</h1>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Project OS
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1e293b] text-[#64748b]">
            {userRole}
          </span>
        </div>
        <p className="text-sm text-[#94a3b8] leading-relaxed max-w-2xl">{VISION_ONELINER}</p>
        {member && (
          <p className="text-xs text-[#475569] mt-2">
            Welcome back, <span className="text-white font-semibold">{member.name || member.email}</span>
          </p>
        )}
        <div className="h-[2px] mt-4 rounded-full bg-gradient-to-r from-blue-500/30 via-purple-500/20 to-transparent" />
      </div>

      {/* === ADMIN / COFOUNDER VIEW === */}
      {canEdit && (
        <>
          {/* Top metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard label="Completion" value={`${completionPct}%`} sub={`${checklistDone}/${checklistTotal} items`} color={completionPct > 50 ? "#10b981" : "#f59e0b"} />
            <MetricCard label="Sprint Tasks" value={`${tasksDone}/${sprintTasks.length}`} sub={currentSprint?.name} color="#8b5cf6" />
            <MetricCard label="Open Decisions" value={openDecisions.length} sub="awaiting resolution" color="#f59e0b" link="/pourquoi/decisions" />
            <MetricCard label="Next Sprint" value={nextSprint ? `${daysUntil(nextSprint.date)}d` : "Final"} sub={nextSprint?.name || "Demo Day"} color="#06b6d4" />
          </div>

          {/* My Tasks */}
          {mySprintTasks.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-[#64748b] uppercase tracking-wider">My Tasks This Sprint</h2>
                <Link href="/projet/features" className="text-xs text-blue-400 hover:underline">View Board</Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {mySprintTasks.slice(0, 6).map((t) => (
                  <Card key={t.id}>
                    <div className="flex items-center gap-3">
                      <StatusDot status={t.status} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{t.title}</p>
                        <p className="text-[10px] text-[#475569] font-mono">{t.priority} / {t.status}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Blocked tasks alert */}
          {tasksBlocked > 0 && (
            <Card className="border-l-2 border-l-red-500">
              <div className="flex items-center gap-3">
                <span className="text-red-400 text-lg">!</span>
                <div>
                  <p className="text-sm font-bold text-red-400">{tasksBlocked} blocked task{tasksBlocked > 1 ? "s" : ""}</p>
                  <p className="text-xs text-[#475569]">Resolve blockers to keep the sprint on track</p>
                </div>
                <Link href="/projet/features" className="ml-auto text-xs text-red-400 hover:underline">Fix now</Link>
              </div>
            </Card>
          )}

          {/* Open Decisions */}
          {openDecisions.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-[#64748b] uppercase tracking-wider mb-3">Decisions To Resolve</h2>
              <div className="space-y-2">
                {openDecisions.slice(0, 3).map((d) => (
                  <Link key={d.id} href="/pourquoi/decisions">
                    <Card className="hover:border-[#334155] cursor-pointer transition-all">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">OPEN</span>
                        <span className="text-sm text-white truncate">{d.title}</span>
                        <span className="text-[10px] text-[#475569] font-mono ml-auto">{timeAgo(d.created_at)}</span>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Checklist Progress by Pillar */}
          <div>
            <h2 className="text-sm font-bold text-[#64748b] uppercase tracking-wider mb-3">Pillar Progress</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {["why", "team", "resources", "project", "market", "finances", "analytics"].map((pillar) => {
                const items = (checklist || []).filter((c) => c.pillar === pillar);
                const done = items.filter((c) => c.status === "done" || c.status === "validated").length;
                const pct = items.length > 0 ? Math.round((done / items.length) * 100) : 0;
                const colors = { why: "#3b82f6", team: "#8b5cf6", resources: "#10b981", project: "#f59e0b", market: "#ec4899", finances: "#ef4444", analytics: "#06b6d4" };
                const paths = { why: "/pourquoi", team: "/equipe", resources: "/ressources", project: "/projet", market: "/clients", finances: "/finances", analytics: "/analytics" };
                return (
                  <Link key={pillar} href={paths[pillar]}>
                    <Card className="hover:border-[#334155] cursor-pointer transition-all h-full">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[pillar] }} />
                        <span className="text-xs font-bold text-white capitalize">{pillar}</span>
                        <span className="text-[10px] text-[#475569] font-mono ml-auto">{done}/{items.length}</span>
                      </div>
                      <div className="h-1.5 bg-[#1e293b] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: colors[pillar] }} />
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* === MENTOR VIEW === */}
      {isMentor && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard label="Completion" value={`${completionPct}%`} sub={`${checklistDone}/${checklistTotal} items`} color={completionPct > 50 ? "#10b981" : "#f59e0b"} />
            <MetricCard label="Open Decisions" value={openDecisions.length} sub="your opinion needed" color="#f59e0b" link="/pourquoi/decisions" />
            <MetricCard label="Objectives" value={`${approvedObjectives}/${(objectives || []).length}`} sub="approved" color="#10b981" link="/objectives" />
          </div>

          <Card className="border-l-2 border-l-blue-500">
            <p className="text-xs text-[#64748b] font-medium uppercase tracking-wider mb-2">Your Role as Mentor</p>
            <p className="text-sm text-[#94a3b8]">
              You have read-only access to the full project. You can comment on checklist items,
              vote on decisions, and validate objectives. Your expertise helps the team make better decisions.
            </p>
          </Card>

          {openDecisions.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-[#64748b] uppercase tracking-wider mb-3">Decisions Awaiting Your Input</h2>
              <div className="space-y-2">
                {openDecisions.map((d) => (
                  <Link key={d.id} href="/pourquoi/decisions">
                    <Card className="hover:border-[#334155] cursor-pointer transition-all">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">OPEN</span>
                        <span className="text-sm text-white truncate">{d.title}</span>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* === OBSERVER VIEW === */}
      {isObserver && (
        <>
          <Card className="border-l-2 border-l-cyan-500">
            <p className="text-xs text-[#64748b] font-medium uppercase tracking-wider mb-2">Welcome</p>
            <p className="text-sm text-[#94a3b8]">
              You're viewing Radar's project cockpit. Explore the mission, check our KPIs,
              and share your feedback to help us build a better product.
            </p>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard label="Progress" value={`${completionPct}%`} sub="overall completion" color="#10b981" />
            <MetricCard label="Objectives" value={`${approvedObjectives}/${(objectives || []).length}`} sub="validated" color="#8b5cf6" />
            <MetricCard label="Sprint" value={currentSprint?.name || "—"} sub={nextSprint ? `${daysUntil(nextSprint.date)}d until next` : "Final sprint"} color="#06b6d4" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/pourquoi/mission">
              <Card className="hover:border-[#334155] cursor-pointer transition-all h-full">
                <p className="text-xs font-bold text-blue-400 uppercase mb-2">Our Mission</p>
                <p className="text-sm text-[#94a3b8]">Discover why Radar exists and what problem we solve</p>
              </Card>
            </Link>
            <Link href="/analytics/kpis">
              <Card className="hover:border-[#334155] cursor-pointer transition-all h-full">
                <p className="text-xs font-bold text-cyan-400 uppercase mb-2">KPIs</p>
                <p className="text-sm text-[#94a3b8]">See our key metrics and progress towards Demo Day</p>
              </Card>
            </Link>
            <Link href="/feedback">
              <Card className="hover:border-[#334155] cursor-pointer transition-all h-full">
                <p className="text-xs font-bold text-green-400 uppercase mb-2">Give Feedback</p>
                <p className="text-sm text-[#94a3b8]">Share your ideas, report bugs, suggest features</p>
              </Card>
            </Link>
            <Link href="/guide">
              <Card className="hover:border-[#334155] cursor-pointer transition-all h-full">
                <p className="text-xs font-bold text-purple-400 uppercase mb-2">Guide</p>
                <p className="text-sm text-[#94a3b8]">Learn how Project OS works</p>
              </Card>
            </Link>
          </div>
        </>
      )}

      {/* Recent Activity — visible to admin/cofounder/mentor */}
      {!isObserver && (
        <div>
          <h2 className="text-sm font-bold text-[#64748b] uppercase tracking-wider mb-3">Recent Activity</h2>
          <Card>
            {(activity || []).length === 0 ? (
              <p className="text-sm text-[#475569] text-center py-4">No activity yet. Start building!</p>
            ) : (
              <div className="divide-y divide-[#1e293b]">
                {(activity || []).slice(0, 8).map((a, i) => {
                  const emojis = { created: "+" , updated: "~", completed: "v", commented: "#", invited: "i", resolved: "!", deleted: "x", responded: ">" };
                  return (
                    <div key={a.id || i} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                      <span className="text-[10px] font-mono text-[#475569] w-4 text-center">{emojis[a.action] || "."}</span>
                      <span className="text-xs text-[#94a3b8] font-semibold shrink-0">{a.actor_name || "System"}</span>
                      <span className="text-xs text-[#475569]">{a.action}</span>
                      <span className="text-xs text-[#64748b] font-mono shrink-0">{a.entity_type}</span>
                      <span className="text-xs text-[#e2e8f0] truncate flex-1">{a.entity_title || ""}</span>
                      <span className="text-[10px] text-[#475569] font-mono shrink-0">{timeAgo(a.created_at)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Team — visible to admin/cofounder */}
      {canEdit && (
        <div>
          <h2 className="text-sm font-bold text-[#64748b] uppercase tracking-wider mb-3">Team</h2>
          <div className="flex gap-4 flex-wrap">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-2 px-3 py-2 bg-[#0d1117] border border-[#1e293b] rounded-lg">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: m.color || "#3b82f6" }}
                >
                  {(m.name || m.email || "?").charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{m.name || m.email}</p>
                  <p className="text-[10px] text-[#64748b] font-mono">{m.role}{m.builder ? ` (${m.builder})` : ""}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions — admin/cofounder */}
      {canEdit && (
        <div className="flex gap-3 flex-wrap pt-2">
          <QuickLink href="/projet/features" label="Board" />
          <QuickLink href="/setup/checklist" label="Checklist" />
          <QuickLink href="/pourquoi/decisions" label="Decisions" />
          <QuickLink href="/objectives" label="Objectives" />
          <QuickLink href="/equipe/members" label="Members" />
          <QuickLink href="/analytics/health" label="Health" />
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, sub, color, link }) {
  const content = (
    <Card>
      <p className="text-xs text-[#64748b] font-medium uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-extrabold" style={{ color }}>{value}</p>
      <p className="text-xs text-[#475569] mt-1">{sub}</p>
    </Card>
  );
  if (link) return <Link href={link}>{content}</Link>;
  return content;
}

function StatusDot({ status }) {
  const colors = { todo: "#475569", in_progress: "#3b82f6", done: "#10b981", blocked: "#ef4444" };
  return <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colors[status] || "#475569" }} />;
}

function QuickLink({ href, label }) {
  return (
    <Link
      href={href}
      className="px-4 py-2 text-xs font-semibold rounded-lg text-[#64748b] bg-[#0d1117] border border-[#1e293b] hover:border-[#334155] hover:text-white transition-all"
    >
      {label}
    </Link>
  );
}
