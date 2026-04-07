"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth, useMembers } from "@/lib/AuthProvider";
import { logActivity } from "@/lib/activity";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const COLOR = "#f59e0b";
const TASK_STATUSES = [
  { id: "todo", label: "To Do", color: "#64748b" },
  { id: "in_progress", label: "In Progress", color: "#3b82f6" },
  { id: "done", label: "Done", color: "#10b981" },
  { id: "blocked", label: "Blocked", color: "#ef4444" },
];

export default function TasksPage() {
  const { user, member, canEdit } = useAuth();
  const members = useMembers();
  const [tasks, setTasks] = useState([]);
  const [features, setFeatures] = useState([]);
  const [workflow, setWorkflow] = useState([]);
  const [view, setView] = useState("board");
  const [filterFeature, setFilterFeature] = useState("all");
  const [filterPerson, setFilterPerson] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", output: "", feature_id: "", assigned_to: "", workflow_step: "", deadline: "", priority: "medium" });
  const [showUpload, setShowUpload] = useState(false);
  const [uploadJson, setUploadJson] = useState("");
  const [loading, setLoading] = useState(true);

  const activeMembers = members.filter((m) => m.status === "active");

  useEffect(() => {
    fetchAll();
    const sub = supabase.channel("tasks_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_tasks" }, fetchAll)
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  async function fetchAll() {
    try {
      const [{ data: t }, { data: f }, { data: wf }] = await Promise.all([
        supabase.from("cockpit_tasks").select("*").order("sort_order").order("created_at"),
        supabase.from("cockpit_vision").select("id, title, body").eq("topic", "roadmap"),
        supabase.from("cockpit_vision").select("body").eq("topic", "workflow").limit(1).maybeSingle(),
      ]);
      setTasks(t || []);
      setFeatures((f || []).map((r) => ({ id: r.id, title: r.title })));
      try { setWorkflow(JSON.parse(wf?.body || "{}").steps || []); } catch { setWorkflow([]); }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function addTask(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    const { error } = await supabase.from("cockpit_tasks").insert({
      title: form.title.trim(), description: form.description || null, output: form.output || null,
      feature_id: form.feature_id || null, assigned_to: form.assigned_to || null,
      workflow_step: form.workflow_step || null, deadline: form.deadline || null,
      priority: form.priority, status: "todo", sprint: 1, builder: member?.builder || "A",
      sort_order: tasks.length,
    });
    if (!error) {
      await logActivity("created", "task", { title: form.title.trim() });
      setForm({ title: "", description: "", output: "", feature_id: "", assigned_to: "", workflow_step: "", deadline: "", priority: "medium" });
      setShowForm(false);
      fetchAll();
    }
  }

  async function updateStatus(task, status) {
    await supabase.from("cockpit_tasks").update({ status }).eq("id", task.id);
    await logActivity(status === "done" ? "completed" : "updated", "task", { title: task.title });
  }

  async function deleteTask(task) {
    await supabase.from("cockpit_tasks").delete().eq("id", task.id);
  }

  async function handleUpload() {
    if (!uploadJson.trim()) return;
    try {
      const items = JSON.parse(uploadJson);
      if (!Array.isArray(items)) return alert("Expected JSON array");
      let count = 0;
      for (const item of items) {
        if (!item.title) continue;
        await supabase.from("cockpit_tasks").insert({
          title: item.title, description: item.description || null, output: item.output || null,
          feature_id: item.feature_id || null, assigned_to: item.assigned_to || null,
          workflow_step: item.workflow_step || null, deadline: item.deadline || null,
          priority: item.priority || "medium", status: "todo", sprint: 1, builder: member?.builder || "A",
          parent_id: null, sort_order: tasks.length + count,
        });
        // Sub-tasks
        if (Array.isArray(item.subtasks)) {
          const { data: parent } = await supabase.from("cockpit_tasks").select("id").eq("title", item.title).order("created_at", { ascending: false }).limit(1).single();
          for (const sub of item.subtasks) {
            await supabase.from("cockpit_tasks").insert({
              title: sub.title || sub, description: sub.description || null, output: sub.output || null,
              parent_id: parent?.id, feature_id: item.feature_id || null,
              assigned_to: sub.assigned_to || item.assigned_to || null,
              workflow_step: sub.workflow_step || item.workflow_step || null,
              priority: "medium", status: "todo", sprint: 1, builder: member?.builder || "A",
              sort_order: 0,
            });
          }
        }
        count++;
      }
      await logActivity("created", "task", { title: `Uploaded ${count} tasks` });
      setUploadJson(""); setShowUpload(false); fetchAll();
    } catch (err) { alert("Invalid JSON: " + err.message); }
  }

  function downloadPrompt() {
    const featCtx = features.map((f) => `- ${f.title}`).join("\n");
    const wfCtx = workflow.map((s) => `${s.order}. ${s.name} (${s.min_role}, agent: ${s.can_be_agent ? "yes" : "no"})`).join("\n");
    const membersCtx = activeMembers.map((m) => `- ${m.name} (${m.role})`).join("\n");

    const md = `# Task Generation Prompt

## Instructions
Generate tasks for the features below. For each feature, create tasks following the workflow steps.

Return a JSON array where each object has:
- \`title\`: task name
- \`description\`: what to do
- \`output\`: expected deliverable
- \`feature_id\`: feature UUID (from list below)
- \`assigned_to\`: person name from team
- \`workflow_step\`: step ID from workflow
- \`priority\`: low/medium/high/critical
- \`deadline\`: ISO date string
- \`subtasks\`: optional array of {title, description, output, assigned_to}

## Workflow Steps
${wfCtx || "No workflow defined"}

## Features
${featCtx || "No features yet"}

## Team
${membersCtx}

Return ONLY the JSON array.`;

    const blob = new Blob([md], { type: "text/markdown" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `radar-tasks-prompt-${new Date().toISOString().slice(0, 10)}.md`; a.click();
  }

  // Filtering
  let displayed = tasks;
  if (filterFeature !== "all") displayed = displayed.filter((t) => t.feature_id === filterFeature);
  if (filterPerson !== "all") displayed = displayed.filter((t) => t.assigned_to === filterPerson);

  const myName = member?.name || member?.email;
  const myTasks = tasks.filter((t) => t.assigned_to === myName && t.status !== "done");
  const parentTasks = displayed.filter((t) => !t.parent_id);
  const childTasks = (pid) => displayed.filter((t) => t.parent_id === pid);

  // Gantt data
  const now = new Date();
  const ganttStart = new Date(now); ganttStart.setDate(ganttStart.getDate() - 3);
  const ganttDays = 30;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <PageHeader title="Tasks" subtitle={`${tasks.length} tasks — ${myTasks.length} assigned to you`} color={COLOR}>
        <div className="flex gap-2">
          {[{ id: "board", l: "Board" }, { id: "mine", l: "My Tasks" }, { id: "gantt", l: "Gantt" }].map((v) => (
            <button key={v.id} onClick={() => setView(v.id)}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border transition ${view === v.id ? "border-amber-500 text-amber-400 bg-amber-500/10" : "border-[#1e293b] text-[#475569]"}`}>
              {v.l}
            </button>
          ))}
          <button onClick={downloadPrompt} className="px-3 py-1.5 text-[10px] font-bold rounded-lg text-blue-400 bg-blue-500/10 border border-blue-500/20">Prompt</button>
          <button onClick={() => setShowUpload(!showUpload)} className="px-3 py-1.5 text-[10px] font-bold rounded-lg text-green-400 bg-green-500/10 border border-green-500/20">Upload</button>
          {canEdit && <button onClick={() => setShowForm(!showForm)} className="px-3 py-1.5 text-[10px] font-bold rounded-lg text-white bg-amber-500">+ Task</button>}
        </div>
      </PageHeader>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select value={filterFeature} onChange={(e) => setFilterFeature(e.target.value)}
          className="py-1 px-2 rounded border border-[#1e293b] bg-transparent text-[10px] text-[#475569] outline-none">
          <option value="all">All features</option>
          {features.map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}
        </select>
        <select value={filterPerson} onChange={(e) => setFilterPerson(e.target.value)}
          className="py-1 px-2 rounded border border-[#1e293b] bg-transparent text-[10px] text-[#475569] outline-none">
          <option value="all">All people</option>
          {activeMembers.map((m) => <option key={m.id} value={m.name || m.email}>{m.name || m.email}</option>)}
        </select>
        <div className="flex gap-2 ml-auto">
          {TASK_STATUSES.map((s) => {
            const c = tasks.filter((t) => t.status === s.id).length;
            return <span key={s.id} className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ color: s.color, backgroundColor: s.color + "15" }}>{c} {s.label}</span>;
          })}
        </div>
      </div>

      {/* Upload */}
      {showUpload && (
        <Card>
          <p className="text-xs text-[#64748b] mb-2">Paste JSON array of tasks:</p>
          <textarea value={uploadJson} onChange={(e) => setUploadJson(e.target.value)} rows={6}
            placeholder='[{"title":"...","feature_id":"...","assigned_to":"...","subtasks":[{"title":"..."}]}]'
            className="w-full py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-green-300 text-xs font-mono outline-none resize-none" />
          <div className="flex gap-2 mt-2">
            <button onClick={handleUpload} className="px-4 py-2 text-xs font-bold rounded-lg text-white bg-green-500">Import</button>
            <button onClick={() => setShowUpload(false)} className="px-4 py-2 text-xs rounded-lg text-[#64748b] bg-[#1e293b]">Cancel</button>
          </div>
        </Card>
      )}

      {/* Add form */}
      {showForm && (
        <Card>
          <form onSubmit={addTask} className="space-y-3">
            <input type="text" placeholder="Task title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-sm outline-none" required />
            <div className="grid grid-cols-2 gap-3">
              <input type="text" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-xs outline-none" />
              <input type="text" placeholder="Expected output" value={form.output} onChange={(e) => setForm({ ...form, output: e.target.value })}
                className="py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-xs outline-none" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <select value={form.feature_id} onChange={(e) => setForm({ ...form, feature_id: e.target.value })}
                className="py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-xs outline-none">
                <option value="">No feature</option>
                {features.map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}
              </select>
              <select value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                className="py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-xs outline-none">
                <option value="">Unassigned</option>
                {activeMembers.map((m) => <option key={m.id} value={m.name || m.email}>{m.name || m.email}</option>)}
                <option value="Agent">Agent</option>
              </select>
              <select value={form.workflow_step} onChange={(e) => setForm({ ...form, workflow_step: e.target.value })}
                className="py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-xs outline-none">
                <option value="">No step</option>
                {workflow.map((s) => <option key={s.id} value={s.id}>{s.order}. {s.name}</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                className="py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-xs outline-none" />
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-xs outline-none">
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
              </select>
              <button type="submit" className="px-4 py-2 text-xs font-bold rounded-lg text-white bg-amber-500">Add</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-xs rounded-lg text-[#64748b] bg-[#1e293b]">Cancel</button>
            </div>
          </form>
        </Card>
      )}

      {loading ? <p className="text-sm text-[#475569] text-center py-8">Loading...</p> : (
        <>
          {/* Board view */}
          {view === "board" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {TASK_STATUSES.map((status) => {
                const items = parentTasks.filter((t) => t.status === status.id);
                return (
                  <div key={status.id}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: status.color }} />
                      <span className="text-xs font-bold" style={{ color: status.color }}>{status.label}</span>
                      <span className="text-[9px] text-[#475569]">({items.length})</span>
                    </div>
                    <div className="space-y-2">
                      {items.map((t) => <TaskCard key={t.id} task={t} features={features} workflow={workflow} children={childTasks(t.id)} onStatus={updateStatus} onDelete={deleteTask} canEdit={canEdit} />)}
                      {items.length === 0 && <div className="rounded-lg border border-dashed border-[#1e293b] p-4 text-center text-[10px] text-[#334155]">Empty</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* My Tasks */}
          {view === "mine" && (
            <div className="space-y-2">
              {myTasks.length === 0 ? (
                <Card><p className="text-sm text-[#475569] text-center py-6">No tasks assigned to you.</p></Card>
              ) : myTasks.sort((a, b) => new Date(a.deadline || "2099-01-01") - new Date(b.deadline || "2099-01-01")).map((t) => (
                <TaskCard key={t.id} task={t} features={features} workflow={workflow} children={childTasks(t.id)} onStatus={updateStatus} onDelete={deleteTask} canEdit={canEdit} />
              ))}
            </div>
          )}

          {/* Gantt */}
          {view === "gantt" && (
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Header — days */}
                <div className="flex border-b border-[#1e293b] mb-2">
                  <div className="w-48 shrink-0 text-[9px] text-[#475569] py-1">Feature / Task</div>
                  {Array.from({ length: ganttDays }).map((_, i) => {
                    const d = new Date(ganttStart); d.setDate(d.getDate() + i);
                    const isToday = d.toDateString() === now.toDateString();
                    return (
                      <div key={i} className={`flex-1 text-center text-[8px] py-1 ${isToday ? "text-amber-400 font-bold" : "text-[#334155]"}`}>
                        {d.getDate()}
                      </div>
                    );
                  })}
                </div>
                {/* Rows */}
                {features.map((feat) => {
                  const featTasks = parentTasks.filter((t) => t.feature_id === feat.id);
                  if (featTasks.length === 0) return null;
                  return (
                    <div key={feat.id} className="mb-3">
                      <div className="text-[10px] font-bold text-amber-400 mb-1 truncate w-48">{feat.title}</div>
                      {featTasks.map((t) => (
                        <GanttRow key={t.id} task={t} ganttStart={ganttStart} ganttDays={ganttDays} />
                      ))}
                    </div>
                  );
                })}
                {/* Unlinked tasks */}
                {parentTasks.filter((t) => !t.feature_id).length > 0 && (
                  <div className="mb-3">
                    <div className="text-[10px] font-bold text-[#475569] mb-1">Unlinked Tasks</div>
                    {parentTasks.filter((t) => !t.feature_id).map((t) => (
                      <GanttRow key={t.id} task={t} ganttStart={ganttStart} ganttDays={ganttDays} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TaskCard({ task, features, workflow, children, onStatus, onDelete, canEdit }) {
  const feat = features.find((f) => f.id === task.feature_id);
  const step = workflow.find((s) => s.id === task.workflow_step);
  const status = TASK_STATUSES.find((s) => s.id === task.status);
  const overdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== "done";

  return (
    <Card className={`border-l-2 ${overdue ? "border-l-red-500" : ""}`} style={{ borderLeftColor: overdue ? undefined : status?.color }}>
      <div className="space-y-1.5">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white">{task.title}</p>
            {task.description && <p className="text-[10px] text-[#64748b] mt-0.5">{task.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {feat && <span className="text-[9px] text-amber-400 bg-amber-400/10 px-1 py-0.5 rounded font-mono">{feat.title.slice(0, 20)}</span>}
          {step && <span className="text-[9px] text-blue-400 bg-blue-400/10 px-1 py-0.5 rounded font-mono">{step.name}</span>}
          {task.assigned_to && <span className="text-[9px] text-[#64748b]">@{task.assigned_to}</span>}
          {task.deadline && <span className={`text-[9px] font-mono ${overdue ? "text-red-400" : "text-[#475569]"}`}>{new Date(task.deadline).toLocaleDateString("fr-FR")}</span>}
          {task.output && <span className="text-[9px] text-green-400/60">→ {task.output.slice(0, 20)}</span>}
        </div>
        {/* Sub-tasks */}
        {children.length > 0 && (
          <div className="pl-3 border-l border-[#1e293b] space-y-1 mt-1">
            {children.map((sub) => (
              <div key={sub.id} className="flex items-center gap-2">
                <input type="checkbox" checked={sub.status === "done"} onChange={() => onStatus(sub, sub.status === "done" ? "todo" : "done")} className="rounded border-[#334155]" />
                <span className={`text-[10px] ${sub.status === "done" ? "text-[#475569] line-through" : "text-[#e2e8f0]"}`}>{sub.title}</span>
              </div>
            ))}
          </div>
        )}
        {/* Status buttons */}
        {canEdit && (
          <div className="flex gap-1 pt-1">
            {TASK_STATUSES.filter((s) => s.id !== task.status).map((s) => (
              <button key={s.id} onClick={() => onStatus(task, s.id)} className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ color: s.color, backgroundColor: s.color + "15" }}>{s.label}</button>
            ))}
            <button onClick={() => onDelete(task)} className="text-[9px] text-red-400/30 hover:text-red-400 ml-auto">X</button>
          </div>
        )}
      </div>
    </Card>
  );
}

function GanttRow({ task, ganttStart, ganttDays }) {
  const status = TASK_STATUSES.find((s) => s.id === task.status);
  const created = new Date(task.created_at);
  const deadline = task.deadline ? new Date(task.deadline) : new Date(created.getTime() + 7 * 24 * 3600 * 1000);
  const startDay = Math.max(0, Math.floor((created - ganttStart) / (24 * 3600 * 1000)));
  const endDay = Math.min(ganttDays, Math.floor((deadline - ganttStart) / (24 * 3600 * 1000)));
  const width = Math.max(1, endDay - startDay);

  return (
    <div className="flex items-center h-6">
      <div className="w-48 shrink-0 text-[9px] text-[#94a3b8] truncate pr-2">{task.title}</div>
      <div className="flex-1 relative h-4">
        {startDay < ganttDays && endDay > 0 && (
          <div className="absolute top-0 h-full rounded-sm" style={{
            left: `${(startDay / ganttDays) * 100}%`, width: `${(width / ganttDays) * 100}%`,
            backgroundColor: status?.color || "#475569", opacity: 0.7,
          }} />
        )}
      </div>
    </div>
  );
}
