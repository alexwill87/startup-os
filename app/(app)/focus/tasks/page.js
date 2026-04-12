"use client";

/**
 * V1 Tasks page — Cockpit Design System v3.0
 *
 * Tasks are stored as cockpit_features_os rows with work_kind="mission".
 * Kanban Todo / Doing / Done with filters: status, type, owner, project, sprint.
 */

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth, useMembers } from "@/lib/AuthProvider";
import { logActivity } from "@/lib/activity";
import {
  PageLayout,
  Topbar,
  PageTitle,
  KpiRow,
  KpiCard,
  Button,
  Badge,
  Footer,
  FormGroup,
  FormLabel,
  FormInput,
  FormSelect,
  FormTextarea,
} from "@/app/components/ui";

const TASK_TYPES = [
  { id: "dev", label: "Dev" },
  { id: "ai", label: "AI" },
  { id: "infra", label: "Infra" },
  { id: "design", label: "Design" },
  { id: "marketing", label: "Marketing" },
  { id: "communication", label: "Communication" },
  { id: "research", label: "Research" },
  { id: "audit", label: "Audit" },
  { id: "deployment", label: "Deployment" },
  { id: "operations", label: "Operations" },
];

const STATUSES = [
  { id: "todo", label: "Todo", variant: "neutral" },
  { id: "doing", label: "Doing", variant: "warn" },
  { id: "done", label: "Done", variant: "success" },
];

function getTaskStatus(t) {
  if (t.step_3_done) return "done";
  if (t.step_1_done) return "doing";
  return "todo";
}

export default function V1TasksPage() {
  const { member, canEdit } = useAuth();
  const members = useMembers();
  const searchParams = useSearchParams();
  const qProject = searchParams.get("project");
  const qNew = searchParams.get("new");
  const [tasks, setTasks] = useState([]);
  const [features, setFeatures] = useState([]);
  const [projects, setProjects] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(!!qNew);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterOwner, setFilterOwner] = useState("all");
  const [filterProject, setFilterProject] = useState("all");
  const [filterSprint, setFilterSprint] = useState("all");
  const [form, setForm] = useState({
    name: "",
    description: "",
    feature_type: "dev",
    owner: "",
    project_id: qProject || "",
    sprint_id: "",
    supports_feature_id: "",
  });

  const activeMembers = useMemo(() => members.filter((m) => m.status === "active"), [members]);

  useEffect(() => {
    fetchAll();
    const sub = supabase
      .channel("v1_tasks_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_features_os" }, fetchAll)
      .subscribe();
    return () => supabase.removeChannel(sub);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchAll() {
    const [{ data: allFeats }, { data: proj }, { data: spr }] = await Promise.all([
      supabase.from("cockpit_features_os").select("*").order("updated_at", { ascending: false }),
      supabase.from("cockpit_projects").select("id, name").order("name"),
      supabase.from("cockpit_sprints").select("id, name, status").order("start_date"),
    ]);
    const all = allFeats || [];
    setTasks(all.filter((f) => f.work_kind === "mission"));
    setFeatures(all.filter((f) => f.work_kind === "feature" && f.stage === "feature"));
    setProjects(proj || []);
    setSprints(spr || []);
    setLoading(false);
  }

  async function createTask(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const { error } = await supabase.from("cockpit_features_os").insert({
      name: form.name,
      description: form.description || null,
      feature_type: form.feature_type,
      owner: form.owner || null,
      project_id: form.project_id || null,
      sprint_id: form.sprint_id || null,
      supports_feature_id: form.supports_feature_id || null,
      work_kind: "mission",
      stage: "feature",
      category: "utile",
      status: "reflexion",
      created_by: member?.name || "Admin",
    });
    if (error) {
      alert("Error: " + error.message);
      return;
    }
    logActivity("created", "task", { title: form.name });
    setForm({ name: "", description: "", feature_type: "dev", owner: "", project_id: "", sprint_id: "", supports_feature_id: "" });
    setShowForm(false);
  }

  async function setStatus(taskId, newStatus) {
    const updates = {
      step_1_done: newStatus === "doing" || newStatus === "done",
      step_2_done: newStatus === "done",
      step_3_done: newStatus === "done",
      updated_at: new Date().toISOString(),
    };
    await supabase.from("cockpit_features_os").update(updates).eq("id", taskId);
  }

  async function deleteTask(id) {
    if (!confirm("Delete this task?")) return;
    await supabase.from("cockpit_features_os").delete().eq("id", id);
  }

  const filtered = tasks.filter((t) => {
    if (filterStatus !== "all" && getTaskStatus(t) !== filterStatus) return false;
    if (filterType !== "all" && t.feature_type !== filterType) return false;
    if (filterOwner !== "all" && t.owner !== filterOwner) return false;
    if (filterProject !== "all" && t.project_id !== filterProject) return false;
    if (filterSprint !== "all" && t.sprint_id !== filterSprint) return false;
    return true;
  });

  // ---- KPIs ----
  const total = tasks.length;
  const todoCount = tasks.filter((t) => getTaskStatus(t) === "todo").length;
  const doingCount = tasks.filter((t) => getTaskStatus(t) === "doing").length;
  const doneCount = tasks.filter((t) => getTaskStatus(t) === "done").length;

  // ---- Project lookup ----
  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));
  const sprintMap = Object.fromEntries(sprints.map((s) => [s.id, s.name]));

  // ---- Owners from tasks ----
  const taskOwners = [...new Set(tasks.map((t) => t.owner).filter(Boolean))];
  // ---- Projects that have tasks ----
  const taskProjects = projects.filter((p) => tasks.some((t) => t.project_id === p.id));
  // ---- Sprints that have tasks ----
  const taskSprints = sprints.filter((s) => tasks.some((t) => t.sprint_id === s.id));

  return (
    <PageLayout>
      <Topbar
        breadcrumb={["Focus", "Tasks"]}
        actions={
          <>
            <Button variant="ghost" onClick={fetchAll}>Refresh</Button>
            {canEdit && (
              <Button variant="primary" onClick={() => setShowForm(!showForm)}>
                {showForm ? "Close form" : "New Task"}
              </Button>
            )}
          </>
        }
      />
      <main style={{ flex: 1, padding: "1.5rem 1.75rem", overflowY: "auto", maxWidth: "1100px", width: "100%", margin: "0 auto" }}>
        <PageTitle
          title="Tasks"
          description="Operational work — kanban Todo / Doing / Done. Filter by project, sprint, type or owner."
        />

        <KpiRow>
          <KpiCard label="Total" value={String(total)} trend="tasks" variant="accent" />
          <KpiCard label="Todo" value={String(todoCount)} trend="not started" variant="muted" />
          <KpiCard label="Doing" value={String(doingCount)} trend="in progress" variant="warn" />
          <KpiCard label="Done" value={String(doneCount)} trend="completed" variant="success" />
        </KpiRow>

        {/* Filters */}
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center", marginBottom: "1rem" }}>
          {/* Status */}
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <span style={{ fontSize: "11px", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>Status</span>
            {[{ id: "all", label: "All" }, ...STATUSES].map((s) => (
              <button
                key={s.id}
                onClick={() => setFilterStatus(s.id)}
                style={{
                  padding: "4px 9px",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--border)",
                  background: filterStatus === s.id ? "var(--bg-3)" : "transparent",
                  color: filterStatus === s.id ? "var(--text)" : "var(--text-3)",
                  fontSize: "11px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
          {/* Project */}
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <span style={{ fontSize: "11px", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>Project</span>
            <FormSelect value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
              <option value="all">All</option>
              {taskProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </FormSelect>
          </div>
          {/* Sprint */}
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <span style={{ fontSize: "11px", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>Sprint</span>
            <FormSelect value={filterSprint} onChange={(e) => setFilterSprint(e.target.value)}>
              <option value="all">All</option>
              {taskSprints.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </FormSelect>
          </div>
          {/* Type */}
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <span style={{ fontSize: "11px", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>Type</span>
            <FormSelect value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="all">All</option>
              {TASK_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </FormSelect>
          </div>
          {/* Owner */}
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <span style={{ fontSize: "11px", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>Owner</span>
            <FormSelect value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)}>
              <option value="all">All</option>
              {taskOwners.map((o) => <option key={o} value={o}>{o}</option>)}
            </FormSelect>
          </div>
        </div>

        {/* Create form */}
        {showForm && (
          <section
            style={{
              padding: "1.25rem 1.5rem",
              background: "var(--bg-2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              marginBottom: "1rem",
            }}
          >
            <h3 style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)", marginBottom: "12px" }}>
              Create a new task
            </h3>
            <form onSubmit={createTask} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <FormGroup>
                <FormLabel>Task title *</FormLabel>
                <FormInput
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="What needs to be done?"
                  required
                />
              </FormGroup>
              <FormGroup>
                <FormLabel>Description</FormLabel>
                <FormTextarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </FormGroup>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                <FormGroup>
                  <FormLabel>Project</FormLabel>
                  <FormSelect value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
                    <option value="">— None</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </FormSelect>
                </FormGroup>
                <FormGroup>
                  <FormLabel>Sprint</FormLabel>
                  <FormSelect value={form.sprint_id} onChange={(e) => setForm({ ...form, sprint_id: e.target.value })}>
                    <option value="">— None</option>
                    {sprints.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </FormSelect>
                </FormGroup>
                <FormGroup>
                  <FormLabel>Type</FormLabel>
                  <FormSelect value={form.feature_type} onChange={(e) => setForm({ ...form, feature_type: e.target.value })}>
                    {TASK_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </FormSelect>
                </FormGroup>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <FormGroup>
                  <FormLabel>Owner</FormLabel>
                  <FormSelect value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })}>
                    <option value="">— None</option>
                    {activeMembers.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
                  </FormSelect>
                </FormGroup>
                <FormGroup>
                  <FormLabel>Supports feature</FormLabel>
                  <FormSelect value={form.supports_feature_id} onChange={(e) => setForm({ ...form, supports_feature_id: e.target.value })}>
                    <option value="">— Standalone</option>
                    {features.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </FormSelect>
                </FormGroup>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <Button variant="primary" type="submit">Create</Button>
                <Button variant="ghost" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </section>
        )}

        {/* Kanban */}
        {loading ? (
          <p style={{ textAlign: "center", color: "var(--text-3)", padding: "2rem 0" }}>Loading...</p>
        ) : filtered.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--text-3)", padding: "2rem 0" }}>No tasks found.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            {STATUSES.map((st) => {
              const col = filtered.filter((t) => getTaskStatus(t) === st.id);
              return (
                <div key={st.id}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", padding: "0 4px" }}>
                    <Badge variant={st.variant}>{st.label}</Badge>
                    <span style={{ fontSize: "11px", color: "var(--text-3)" }}>{col.length}</span>
                  </div>
                  <div
                    style={{
                      background: "var(--bg-2)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-lg)",
                      padding: "8px",
                      minHeight: "120px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    {col.length === 0 && (
                      <p style={{ fontSize: "11px", color: "var(--text-3)", textAlign: "center", padding: "1.5rem 0" }}>Empty</p>
                    )}
                    {col.map((t) => {
                      const tt = TASK_TYPES.find((ty) => ty.id === t.feature_type);
                      const supportedFeat = t.supports_feature_id ? features.find((f) => f.id === t.supports_feature_id) : null;
                      return (
                        <article
                          key={t.id}
                          style={{
                            background: "var(--bg-3)",
                            border: "1px solid var(--border)",
                            borderRadius: "var(--radius)",
                            padding: "10px 12px",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start" }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", flexWrap: "wrap" }}>
                                {tt && <Badge variant="neutral">{tt.label}</Badge>}
                                {t.project_id && projectMap[t.project_id] && (
                                  <Link href={`/focus/projects/${t.project_id}`} style={{ textDecoration: "none" }}>
                                    <Badge variant="info">{projectMap[t.project_id]}</Badge>
                                  </Link>
                                )}
                              </div>
                              <h4 style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)", margin: 0, lineHeight: 1.3 }}>{t.name}</h4>
                              {t.description && (
                                <p style={{ fontSize: "11.5px", color: "var(--text-2)", marginTop: "4px", lineHeight: 1.4 }}>{t.description}</p>
                              )}
                              <div style={{ display: "flex", gap: "8px", marginTop: "6px", fontSize: "10.5px", color: "var(--text-3)", flexWrap: "wrap" }}>
                                {t.owner && <span>{t.owner}</span>}
                                {t.sprint_id && sprintMap[t.sprint_id] && <span>{sprintMap[t.sprint_id]}</span>}
                                {t.deadline && <span>{t.deadline}</span>}
                                {supportedFeat && <span>→ {supportedFeat.name}</span>}
                              </div>
                            </div>
                            {canEdit && (
                              <div style={{ display: "flex", flexDirection: "column", gap: "4px", flexShrink: 0 }}>
                                <FormSelect
                                  value={getTaskStatus(t)}
                                  onChange={(e) => setStatus(t.id, e.target.value)}
                                  style={{ padding: "2px 4px", fontSize: "10px" }}
                                >
                                  {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                                </FormSelect>
                                <button
                                  onClick={() => deleteTask(t.id)}
                                  style={{
                                    fontSize: "10px",
                                    color: "var(--text-3)",
                                    background: "transparent",
                                    border: "none",
                                    cursor: "pointer",
                                    padding: "2px 4px",
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </PageLayout>
  );
}
