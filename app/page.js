"use client";

import { useEffect, useState } from "react";
import { supabase, SPRINTS, BUILDERS } from "@/lib/supabase";

const BUILDER_LIST = Object.values(BUILDERS);

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [decisions, setDecisions] = useState([]);

  useEffect(() => {
    fetchData();

    const taskSub = supabase
      .channel("cockpit_tasks_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_tasks" }, fetchData)
      .subscribe();

    const decSub = supabase
      .channel("cockpit_decisions_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_decisions" }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(taskSub);
      supabase.removeChannel(decSub);
    };
  }, []);

  async function fetchData() {
    const [{ data: t }, { data: d }] = await Promise.all([
      supabase.from("cockpit_tasks").select("*"),
      supabase.from("cockpit_decisions").select("*").eq("status", "open"),
    ]);
    setTasks(t || []);
    setDecisions(d || []);
  }

  const currentSprint = SPRINTS.find((s) => new Date(s.date) >= new Date()) || SPRINTS[3];
  const sprintTasks = tasks.filter((t) => t.sprint === currentSprint.id);
  const totalTasks = sprintTasks.length;
  const doneTasks = sprintTasks.filter((t) => t.status === "done").length;
  const blockedTasks = sprintTasks.filter((t) => t.status === "blocked").length;
  const progressPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const now = new Date();
  const nextSprint = SPRINTS.find((s) => new Date(s.date) > now);
  const daysUntil = nextSprint
    ? Math.ceil((new Date(nextSprint.date) - now) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>
        Dashboard — {currentSprint.name}
      </h2>

      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#93c5fd" }}>{progressPct}%</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Sprint Progress</div>
        </div>
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#6ee7b7" }}>
            {doneTasks}/{totalTasks}
          </div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Tasks Done</div>
        </div>
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: blockedTasks > 0 ? "#fca5a5" : "#64748b" }}>
            {blockedTasks}
          </div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Blocked</div>
        </div>
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#fcd34d" }}>
            {daysUntil > 0 ? `${daysUntil}d` : "Today!"}
          </div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Next Sprint</div>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: 24 }}>
        {BUILDER_LIST.map((b) => {
          const bt = sprintTasks.filter((t) => t.builder === b.role);
          const bd = bt.filter((t) => t.status === "done").length;
          const pct = bt.length > 0 ? Math.round((bd / bt.length) * 100) : 0;
          return (
            <div className="card" key={b.role}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span className={`badge badge-${b.role}`}>Builder {b.role}</span>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{b.name}</span>
              </div>
              <div style={{ height: 6, background: "#1e293b", borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
                <div style={{ height: "100%", width: `${pct}%`, background: b.color, borderRadius: 3, transition: "width 0.3s" }} />
              </div>
              <div style={{ fontSize: 12, color: "#64748b", fontFamily: "var(--font-geist-mono)" }}>
                {bd}/{bt.length} tasks done ({pct}%)
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <div className="card-header">
          <span>Open Decisions</span>
          <span className="badge badge-open">{decisions.length} open</span>
        </div>
        {decisions.length === 0 ? (
          <p style={{ color: "#475569", fontSize: 13 }}>No open decisions. All clear!</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {decisions.slice(0, 5).map((d) => (
              <div key={d.id} style={{ padding: "10px 14px", background: "#0a0f1a", borderRadius: 8, border: "1px solid #1e293b", fontSize: 13 }}>
                {d.title}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
