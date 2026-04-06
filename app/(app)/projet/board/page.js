"use client";

import { useState, useEffect } from "react";
import { supabase, SPRINTS } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import { useAuth } from "@/lib/AuthProvider";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const COLOR = "#f59e0b";
const COLUMNS = ["todo", "in_progress", "done", "blocked"];
const COL_LABELS = { todo: "To Do", in_progress: "In Progress", done: "Done", blocked: "Blocked" };
const COL_COLORS = { todo: "#64748b", in_progress: "#3b82f6", done: "#10b981", blocked: "#ef4444" };

const inputClass = "w-full py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-sm font-mono outline-none focus:border-[#3b82f6]";

export default function BoardPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [checklistActions, setChecklistActions] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [view, setView] = useState("kanban"); // kanban or checklist
  const [sprintFilter, setSprintFilter] = useState(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    return ([...SPRINTS].reverse().find((s) => s.date <= todayStr) || SPRINTS[0]).id;
  });
  const [form, setForm] = useState({ title: "", description: "", builder: "", priority: "medium", task_ref: "" });

  useEffect(() => {
    fetchAll();
    const ch1 = supabase.channel("board-tasks").on("postgres_changes", { event: "*", schema: "public", table: "cockpit_tasks" }, fetchAll).subscribe();
    const ch2 = supabase.channel("board-checklist").on("postgres_changes", { event: "*", schema: "public", table: "cockpit_checklist" }, fetchAll).subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [sprintFilter]);

  async function fetchAll() {
    const [{ data: taskData }, { data: actionData }, { data: memberData }] = await Promise.all([
      supabase.from("cockpit_tasks").select("*").eq("sprint", sprintFilter).order("created_at", { ascending: false }),
      supabase.from("cockpit_checklist").select("*").eq("category", "action").order("pillar", { ascending: true }),
      supabase.from("cockpit_members").select("name, builder, color").eq("status", "active"),
    ]);
    setTasks(taskData || []);
    setChecklistActions(actionData || []);
    setMembers(memberData || []);
    setLoading(false);
  }

  async function addTask(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    await supabase.from("cockpit_tasks").insert({ ...form, sprint: sprintFilter, status: "todo" });
    logActivity("created", "task", { title: form.title });
    setForm({ title: "", description: "", builder: "", priority: "medium", task_ref: "" });
    setShowForm(false);
  }

  async function moveTask(id, newStatus) {
    await supabase.from("cockpit_tasks").update({ status: newStatus }).eq("id", id);
    logActivity("updated", "task", { title: `moved to ${newStatus}` });
  }

  async function deleteTask(id) {
    if (!confirm("Delete this task?")) return;
    await supabase.from("cockpit_tasks").delete().eq("id", id);
    logActivity("deleted", "task", {});
  }

  async function updateChecklistStatus(id, newStatus, title) {
    await supabase.from("cockpit_checklist").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", id);
    logActivity(newStatus === "done" ? "completed" : "updated", "checklist", { title });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Board" subtitle="Sprint tasks + checklist actions" color={COLOR}>
        <div className="flex gap-2">
          <button onClick={() => setView("kanban")} className={`px-3 py-1.5 rounded-lg text-xs font-mono ${view === "kanban" ? "bg-[#1e3a5f] text-[#93c5fd]" : "border border-[#1e293b] text-[#64748b]"}`}>Kanban</button>
          <button onClick={() => setView("checklist")} className={`px-3 py-1.5 rounded-lg text-xs font-mono ${view === "checklist" ? "bg-[#1e3a5f] text-[#93c5fd]" : "border border-[#1e293b] text-[#64748b]"}`}>Actions</button>
        </div>
      </PageHeader>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={sprintFilter} onChange={(e) => setSprintFilter(Number(e.target.value))} className={inputClass + " w-auto"}>
          {SPRINTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#1e3a5f] to-[#2d1b69] text-[#93c5fd] text-sm font-bold font-mono">
          + Task
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <Card>
          <form onSubmit={addTask} className="space-y-3">
            <input type="text" placeholder="Task title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className={inputClass} />
            <textarea placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className={inputClass} />
            <div className="grid grid-cols-3 gap-3">
              <select value={form.builder} onChange={(e) => setForm({ ...form, builder: e.target.value })} className={inputClass}>
                <option value="">Assign to...</option>
                {members.map((m) => <option key={m.name} value={m.builder}>{m.name} ({m.builder})</option>)}
              </select>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={inputClass}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              <input type="text" placeholder="Ref (A1, B3...)" value={form.task_ref} onChange={(e) => setForm({ ...form, task_ref: e.target.value })} className={inputClass} />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#1e3a5f] to-[#2d1b69] text-[#93c5fd] text-sm font-bold font-mono">Create</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-[#1e293b] text-[#64748b] text-sm font-mono">Cancel</button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <p className="text-[#475569] text-sm font-mono">Loading...</p>
      ) : view === "kanban" ? (
        /* KANBAN VIEW */
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col);
            return (
              <div key={col}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full" style={{ background: COL_COLORS[col] }} />
                  <span className="text-xs font-bold text-[#94a3b8] uppercase tracking-widest">{COL_LABELS[col]}</span>
                  <span className="text-[10px] text-[#475569] font-mono">{colTasks.length}</span>
                </div>
                <div className="space-y-2 min-h-[80px]">
                  {colTasks.map((task) => {
                    const m = members.find((mb) => mb.builder === task.builder);
                    return (
                      <Card key={task.id} className="!p-3 hover:border-[#334155] transition-colors">
                        <div className="flex items-start justify-between mb-1.5">
                          <span className="text-xs font-medium text-white">{task.title}</span>
                          {task.task_ref && <span className="text-[9px] text-[#475569] font-mono flex-shrink-0 ml-1">{task.task_ref}</span>}
                        </div>
                        {task.description && <p className="text-[10px] text-[#475569] mb-2">{task.description}</p>}
                        <div className="flex items-center gap-1.5 mb-2">
                          {m && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: (m.color || "#3b82f6") + "15", color: m.color || "#3b82f6" }}>
                              {m.name}
                            </span>
                          )}
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                            task.priority === "critical" ? "bg-red-500/10 text-red-400" :
                            task.priority === "high" ? "bg-orange-500/10 text-orange-400" :
                            "bg-slate-500/10 text-slate-400"
                          }`}>{task.priority}</span>
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          {COLUMNS.filter((c) => c !== col).map((c) => (
                            <button key={c} onClick={() => moveTask(task.id, c)}
                              className="text-[9px] px-1.5 py-0.5 rounded border border-[#1e293b] text-[#64748b] hover:text-white hover:border-[#334155] font-mono transition-colors">
                              {COL_LABELS[c]}
                            </button>
                          ))}
                          <button onClick={() => deleteTask(task.id)}
                            className="text-[9px] px-1.5 py-0.5 rounded text-red-400/50 hover:text-red-400 font-mono">
                            Del
                          </button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* CHECKLIST ACTIONS VIEW */
        <div>
          <h3 className="text-xs font-bold text-[#94a3b8] mb-3 uppercase tracking-widest">Checklist Action Items (all pillars)</h3>
          <div className="space-y-2">
            {checklistActions.map((item) => {
              const isDone = item.status === "done" || item.status === "validated";
              const pillarColors = { why: "#3b82f6", team: "#8b5cf6", resources: "#10b981", project: "#f59e0b", market: "#ec4899", finances: "#ef4444", analytics: "#06b6d4" };
              return (
                <Card key={item.id} className={`!p-3 ${isDone ? "opacity-50" : ""}`}>
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: pillarColors[item.pillar] || "#64748b" }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${isDone ? "line-through text-[#475569]" : "text-white font-medium"}`}>{item.title}</span>
                        <span className="text-[9px] text-[#334155] font-mono">{item.pillar}</span>
                      </div>
                      {item.description && <p className="text-[10px] text-[#475569]">{item.description}</p>}
                    </div>
                    <select
                      value={item.status}
                      onChange={(e) => updateChecklistStatus(item.id, e.target.value, item.title)}
                      className="py-1 px-2 rounded border border-[#1e293b] bg-[#0a0f1a] text-[10px] font-mono outline-none"
                      style={{ color: isDone ? "#10b981" : item.status === "in_progress" ? "#3b82f6" : "#64748b" }}
                    >
                      <option value="todo">Todo</option>
                      <option value="in_progress">In Progress</option>
                      <option value="done">Done</option>
                      <option value="validated">Validated</option>
                    </select>
                  </div>
                </Card>
              );
            })}
            {checklistActions.length === 0 && (
              <p className="text-[#475569] text-sm text-center py-8">No action items in the checklist.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
