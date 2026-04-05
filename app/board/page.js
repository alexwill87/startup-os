"use client";

import { useEffect, useState } from "react";
import { supabase, SPRINTS, BUILDERS } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";

const STATUSES = ["todo", "in_progress", "done", "blocked"];
const STATUS_LABELS = { todo: "To Do", in_progress: "In Progress", done: "Done", blocked: "Blocked" };
const BUILDER_LIST = Object.values(BUILDERS);

export default function Board() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [activeSprint, setActiveSprint] = useState(
    SPRINTS.find((s) => new Date(s.date) >= new Date())?.id || 1
  );
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", builder: "A", priority: "medium", task_ref: "" });

  useEffect(() => {
    fetchTasks();
    const sub = supabase
      .channel("board_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_tasks" }, fetchTasks)
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  async function fetchTasks() {
    const { data } = await supabase.from("cockpit_tasks").select("*").order("created_at", { ascending: true });
    setTasks(data || []);
  }

  async function addTask(e) {
    e.preventDefault();
    await supabase.from("cockpit_tasks").insert({
      ...form,
      sprint: activeSprint,
      status: "todo",
      created_by: user.id,
    });
    setForm({ title: "", description: "", builder: "A", priority: "medium", task_ref: "" });
    setShowForm(false);
  }

  async function moveTask(id, newStatus) {
    await supabase.from("cockpit_tasks").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", id);
  }

  async function deleteTask(id) {
    await supabase.from("cockpit_tasks").delete().eq("id", id);
  }

  const sprintTasks = tasks.filter((t) => t.sprint === activeSprint);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>Board</h2>
        <div style={{ display: "flex", gap: 8 }}>
          {SPRINTS.map((s) => (
            <button
              key={s.id}
              className={`btn ${activeSprint === s.id ? "btn-primary" : ""}`}
              onClick={() => setActiveSprint(s.id)}
            >
              S{s.id}
            </button>
          ))}
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            + Task
          </button>
        </div>
      </div>

      {/* Add task form */}
      {showForm && (
        <form onSubmit={addTask} className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <input
              type="text"
              placeholder="Task title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              style={{ gridColumn: "1 / 3" }}
            />
            <input
              type="text"
              placeholder="Ref (A1, B3...)"
              value={form.task_ref}
              onChange={(e) => setForm({ ...form, task_ref: e.target.value })}
            />
            <select value={form.builder} onChange={(e) => setForm({ ...form, builder: e.target.value })}>
              {BUILDER_LIST.map((b) => (
                <option key={b.role} value={b.role}>
                  {b.name} ({b.role})
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12 }}>
            <textarea
              placeholder="Description (optional)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              <button type="submit" className="btn btn-primary">Add</button>
            </div>
          </div>
        </form>
      )}

      {/* Kanban columns */}
      <div className="grid-4">
        {STATUSES.map((status) => {
          const col = sprintTasks.filter((t) => t.status === status);
          return (
            <div key={status}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span className={`badge badge-${status}`}>{STATUS_LABELS[status]}</span>
                <span style={{ fontSize: 12, color: "#64748b" }}>{col.length}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {col.map((task) => (
                  <div key={task.id} className="card" style={{ padding: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <span className={`badge badge-${task.builder}`}>{task.builder}</span>
                      {task.task_ref && (
                        <span style={{ fontSize: 11, color: "#64748b", fontFamily: "var(--font-geist-mono)" }}>
                          {task.task_ref}
                        </span>
                      )}
                      <span className={`badge badge-${task.priority}`} style={{ marginLeft: "auto" }}>
                        {task.priority}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{task.title}</div>
                    {task.description && (
                      <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>{task.description}</div>
                    )}
                    {task.pr_url && (
                      <a
                        href={task.pr_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 11, color: "#3b82f6", display: "block", marginBottom: 8 }}
                      >
                        View PR
                      </a>
                    )}
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {STATUSES.filter((s) => s !== status).map((s) => (
                        <button
                          key={s}
                          className="btn"
                          style={{ fontSize: 10, padding: "3px 8px" }}
                          onClick={() => moveTask(task.id, s)}
                        >
                          {STATUS_LABELS[s]}
                        </button>
                      ))}
                      <button
                        className="btn"
                        style={{ fontSize: 10, padding: "3px 8px", color: "#ef4444" }}
                        onClick={() => deleteTask(task.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
