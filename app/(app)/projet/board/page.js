"use client";
import { useState, useEffect } from "react";
import { supabase, BUILDERS, SPRINTS } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import { useAuth } from "@/lib/AuthProvider";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const BUILDER_LIST = Object.values(BUILDERS);
const COLOR = "#f59e0b";
const COLUMNS = [
  { key: "todo", label: "Todo", bg: "bg-zinc-700" },
  { key: "in_progress", label: "In Progress", bg: "bg-blue-900/40" },
  { key: "done", label: "Done", bg: "bg-green-900/40" },
  { key: "blocked", label: "Blocked", bg: "bg-red-900/40" },
];
const PRIORITIES = ["low", "medium", "high", "critical"];
const PRIORITY_COLORS = { low: "bg-zinc-600", medium: "bg-blue-600", high: "bg-orange-600", critical: "bg-red-600" };

export default function BoardPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [sprintFilter, setSprintFilter] = useState(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const cs = [...SPRINTS].reverse().find((s) => s.date <= todayStr) || SPRINTS[0];
    return cs.id;
  });
  const [form, setForm] = useState({ title: "", description: "", builder: "A", priority: "medium", task_ref: "", pr_url: "" });

  useEffect(() => {
    fetchTasks();
    const channel = supabase
      .channel("board-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_tasks" }, () => fetchTasks())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sprintFilter]);

  async function fetchTasks() {
    const { data } = await supabase
      .from("cockpit_tasks")
      .select("*")
      .eq("sprint", sprintFilter)
      .order("created_at", { ascending: false });
    setTasks(data || []);
    setLoading(false);
  }

  async function addTask(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    await supabase.from("cockpit_tasks").insert({ ...form, sprint: sprintFilter, status: "todo" });
    logActivity("created", "task", { title: form.title });
    setForm({ title: "", description: "", builder: "A", priority: "medium", task_ref: "", pr_url: "" });
    setShowForm(false);
  }

  async function moveTask(id, newStatus) {
    await supabase.from("cockpit_tasks").update({ status: newStatus }).eq("id", id);
    logActivity("updated", "task", { title: "moved to " + newStatus });
  }

  async function deleteTask(id) {
    if (!confirm("Supprimer cette tâche ?")) return;
    await supabase.from("cockpit_tasks").delete().eq("id", id);
    logActivity("deleted", "task", {});
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Kanban Board" color={COLOR} />

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <select
          value={sprintFilter}
          onChange={(e) => setSprintFilter(Number(e.target.value))}
          className="bg-[#0d1117] border border-[#1e293b] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#f59e0b]/50"
        >
          {SPRINTS.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold text-black hover:opacity-90 transition"
          style={{ backgroundColor: COLOR }}
        >
          {showForm ? "Annuler" : "+ Nouvelle tâche"}
        </button>
      </div>

      {/* Add Task Form */}
      {showForm && (
        <Card>
          <form onSubmit={addTask} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              placeholder="Titre *"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white col-span-full"
              required
            />
            <textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white col-span-full"
              rows={2}
            />
            <select
              value={form.builder}
              onChange={(e) => setForm({ ...form, builder: e.target.value })}
              className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white"
            >
              {BUILDER_LIST.map((b) => (
                <option key={b.id} value={b.id}>{b.id} — {b.name}</option>
              ))}
            </select>
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <input
              placeholder="Ref tâche (ex: T-001)"
              value={form.task_ref}
              onChange={(e) => setForm({ ...form, task_ref: e.target.value })}
              className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white"
            />
            <input
              placeholder="PR URL"
              value={form.pr_url}
              onChange={(e) => setForm({ ...form, pr_url: e.target.value })}
              className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded text-sm font-medium text-black col-span-full md:col-span-1"
              style={{ backgroundColor: COLOR }}
            >
              Ajouter
            </button>
          </form>
        </Card>
      )}

      {/* Kanban Columns */}
      {loading ? (
        <p className="text-zinc-400">Chargement...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.key);
            return (
              <div key={col.key} className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-widest">{col.label}</h3>
                  <span className="text-xs text-[#64748b] bg-[#1e293b] rounded-full px-2.5 py-0.5 font-mono">{colTasks.length}</span>
                </div>
                <div className="space-y-3 min-h-[120px]">
                  {colTasks.map((task) => (
                    <div key={task.id} className="bg-[#0d1117] border border-[#1e293b] rounded-lg p-4 space-y-3 hover:border-[#334155] transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-white leading-tight">{task.title}</p>
                        <button onClick={() => deleteTask(task.id)} className="text-zinc-500 hover:text-red-400 text-xs shrink-0">✕</button>
                      </div>
                      {task.description && <p className="text-xs text-zinc-400">{task.description}</p>}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs px-1.5 py-0.5 rounded font-medium text-black" style={{ backgroundColor: COLOR }}>{task.builder}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded text-white ${PRIORITY_COLORS[task.priority] || "bg-zinc-600"}`}>{task.priority}</span>
                        {task.task_ref && <span className="text-xs text-zinc-500">{task.task_ref}</span>}
                        {task.pr_url && (
                          <a href={task.pr_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline">PR</a>
                        )}
                      </div>
                      {/* Move buttons */}
                      <div className="flex gap-1 pt-1">
                        {COLUMNS.filter((c) => c.key !== col.key).map((c) => (
                          <button
                            key={c.key}
                            onClick={() => moveTask(task.id, c.key)}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                          >
                            → {c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
