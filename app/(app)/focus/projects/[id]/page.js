"use client";

/**
 * V1 Project Detail page — /focus/projects/[id]
 *
 * Shows a single project with:
 *  - Project info (Why / How / What)
 *  - Linked tasks (missions) as kanban
 *  - Linked features with progress
 *  - Sprint breakdown
 */

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
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
import GitHubActivityPanel from "@/app/components/GitHubActivityPanel";

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

const TASK_STATUSES = [
  { id: "todo", label: "Todo", variant: "neutral" },
  { id: "doing", label: "Doing", variant: "warn" },
  { id: "done", label: "Done", variant: "success" },
];

const PRIORITIES = [
  { id: "critique", label: "Critical", variant: "danger" },
  { id: "haute", label: "High", variant: "warn" },
  { id: "moyenne", label: "Medium", variant: "neutral" },
  { id: "basse", label: "Low", variant: "neutral" },
];

function getTaskStatus(t) {
  if (t.step_3_done) return "done";
  if (t.step_1_done) return "doing";
  return "todo";
}

function getFeatureProgress(f) {
  return [f.step_1_done, f.step_2_done, f.step_3_done, f.step_4_done, f.step_5_done].filter(Boolean).length;
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const { member, canEdit } = useAuth();
  const members = useMembers();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [features, setFeatures] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterSprint, setFilterSprint] = useState("all");
  const [form, setForm] = useState({
    name: "",
    description: "",
    feature_type: "dev",
    owner: "",
    sprint_id: "",
  });

  const activeMembers = useMemo(() => members.filter((m) => m.status === "active"), [members]);

  useEffect(() => {
    fetchAll();
    const sub = supabase
      .channel("v1_project_detail_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_projects" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_features_os" }, fetchAll)
      .subscribe();
    return () => supabase.removeChannel(sub);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function fetchAll() {
    const [{ data: proj }, { data: items }, { data: spr }] = await Promise.all([
      supabase.from("cockpit_projects").select("*").eq("id", id).single(),
      supabase.from("cockpit_features_os").select("*").eq("project_id", id).order("updated_at", { ascending: false }),
      supabase.from("cockpit_sprints").select("*").order("start_date"),
    ]);
    setProject(proj);
    const all = items || [];
    setTasks(all.filter((f) => f.work_kind === "mission"));
    setFeatures(all.filter((f) => f.work_kind === "feature"));
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
      project_id: id,
      sprint_id: form.sprint_id || null,
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
    logActivity("created", "task", { title: form.name, project: project?.name });
    setForm({ name: "", description: "", feature_type: "dev", owner: "", sprint_id: "" });
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

  async function deleteTask(taskId) {
    if (!confirm("Delete this task?")) return;
    await supabase.from("cockpit_features_os").delete().eq("id", taskId);
  }

  if (loading) {
    return (
      <PageLayout>
        <Topbar breadcrumb={["Focus", "Projects", "..."]} />
        <main style={{ flex: 1, padding: "2rem", textAlign: "center", color: "var(--text-3)" }}>Loading...</main>
        <Footer />
      </PageLayout>
    );
  }

  if (!project) {
    return (
      <PageLayout>
        <Topbar breadcrumb={["Focus", "Projects", "Not found"]} />
        <main style={{ flex: 1, padding: "2rem", textAlign: "center", color: "var(--text-3)" }}>
          Project not found. <Link href="/focus/projects" style={{ color: "var(--accent-text)" }}>Back to Projects</Link>
        </main>
        <Footer />
      </PageLayout>
    );
  }

  const filteredTasks = filterSprint === "all" ? tasks : tasks.filter((t) => t.sprint_id === filterSprint);
  const todoCount = filteredTasks.filter((t) => getTaskStatus(t) === "todo").length;
  const doingCount = filteredTasks.filter((t) => getTaskStatus(t) === "doing").length;
  const doneCount = filteredTasks.filter((t) => getTaskStatus(t) === "done").length;

  const sprintMap = Object.fromEntries(sprints.map((s) => [s.id, s]));
  const projectSprints = sprints.filter((s) => tasks.some((t) => t.sprint_id === s.id));

  const pri = PRIORITIES.find((p) => p.id === project.priority);

  return (
    <PageLayout>
      <Topbar
        breadcrumb={["Focus", "Projects", project.name]}
        actions={
          <>
            <Link href="/focus/projects"><Button variant="ghost">All Projects</Button></Link>
            <Button variant="ghost" onClick={fetchAll}>Refresh</Button>
            {canEdit && (
              <Button variant="primary" onClick={() => setShowForm(!showForm)}>
                {showForm ? "Close" : "New Task"}
              </Button>
            )}
          </>
        }
      />
      <main style={{ flex: 1, padding: "1.5rem 1.75rem", overflowY: "auto", maxWidth: "1100px", width: "100%", margin: "0 auto" }}>
        {/* Project header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text)", margin: 0 }}>{project.name}</h1>
            {pri && <Badge variant={pri.variant}>{pri.label}</Badge>}
            <Badge variant={project.status === "active" ? "success" : "neutral"}>{project.status}</Badge>
          </div>
          {/* Why / How / What */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "12px" }}>
            {[{ label: "Why", value: project.why }, { label: "How", value: project.how }, { label: "What", value: project.what }].map((item) => (
              <div key={item.label} style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "10px 12px" }}>
                <div style={{ fontSize: "10px", color: "var(--text-3)", textTransform: "uppercase", fontWeight: 600, marginBottom: "4px" }}>{item.label}</div>
                <div style={{ fontSize: "12px", color: "var(--text-2)", lineHeight: 1.4 }}>{item.value || "—"}</div>
              </div>
            ))}
          </div>
          {/* Meta */}
          <div style={{ display: "flex", gap: "16px", fontSize: "11px", color: "var(--text-3)" }}>
            {project.responsible && <span>Owner: <strong style={{ color: "var(--text-2)" }}>{project.responsible}</strong></span>}
            {project.controller && <span>Controller: <strong style={{ color: "var(--text-2)" }}>{project.controller}</strong></span>}
            {project.repo_url && <a href={project.repo_url} target="_blank" rel="noreferrer" style={{ color: "var(--accent-text)" }}>GitHub</a>}
            {project.public_url && <a href={project.public_url} target="_blank" rel="noreferrer" style={{ color: "var(--accent-text)" }}>Live</a>}
          </div>
        </div>

        {/* KPIs */}
        <KpiRow>
          <KpiCard label="Tasks" value={String(filteredTasks.length)} trend="total" variant="accent" />
          <KpiCard label="Todo" value={String(todoCount)} trend="not started" variant="muted" />
          <KpiCard label="Doing" value={String(doingCount)} trend="in progress" variant="warn" />
          <KpiCard label="Done" value={String(doneCount)} trend="completed" variant="success" />
        </KpiRow>

        {/* Sprint filter */}
        {projectSprints.length > 0 && (
          <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "1rem" }}>
            <span style={{ fontSize: "11px", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>Sprint</span>
            {[{ id: "all", label: "All" }, ...projectSprints.map((s) => ({ id: s.id, label: s.name.replace("Sprint ", "S") }))].map((s) => (
              <button
                key={s.id}
                onClick={() => setFilterSprint(s.id)}
                style={{
                  padding: "4px 9px",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--border)",
                  background: filterSprint === s.id ? "var(--bg-3)" : "transparent",
                  color: filterSprint === s.id ? "var(--text)" : "var(--text-3)",
                  fontSize: "11px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* Create form */}
        {showForm && (
          <section style={{ padding: "1.25rem 1.5rem", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)", marginBottom: "12px" }}>New task for {project.name}</h3>
            <form onSubmit={createTask} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <FormGroup>
                <FormLabel>Task title *</FormLabel>
                <FormInput type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="What needs to be done?" required />
              </FormGroup>
              <FormGroup>
                <FormLabel>Description</FormLabel>
                <FormTextarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </FormGroup>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
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
                <FormGroup>
                  <FormLabel>Owner</FormLabel>
                  <FormSelect value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })}>
                    <option value="">— None</option>
                    {activeMembers.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
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

        {/* Kanban tasks */}
        <h2 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)", marginBottom: "10px" }}>Tasks</h2>
        {filteredTasks.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--text-3)", padding: "1.5rem 0", fontSize: "12px" }}>No tasks yet.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "2rem" }}>
            {TASK_STATUSES.map((st) => {
              const col = filteredTasks.filter((t) => getTaskStatus(t) === st.id);
              return (
                <div key={st.id}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", padding: "0 4px" }}>
                    <Badge variant={st.variant}>{st.label}</Badge>
                    <span style={{ fontSize: "11px", color: "var(--text-3)" }}>{col.length}</span>
                  </div>
                  <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "8px", minHeight: "80px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    {col.length === 0 && <p style={{ fontSize: "11px", color: "var(--text-3)", textAlign: "center", padding: "1rem 0" }}>Empty</p>}
                    {col.map((t) => {
                      const tt = TASK_TYPES.find((ty) => ty.id === t.feature_type);
                      const sprint = t.sprint_id ? sprintMap[t.sprint_id] : null;
                      return (
                        <article key={t.id} style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "10px 12px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start" }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", flexWrap: "wrap" }}>
                                {tt && <Badge variant="neutral">{tt.label}</Badge>}
                                {sprint && <Badge variant="info">{sprint.name.replace("Sprint ", "S")}</Badge>}
                              </div>
                              <h4 style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)", margin: 0, lineHeight: 1.3 }}>{t.name}</h4>
                              {t.description && <p style={{ fontSize: "11.5px", color: "var(--text-2)", marginTop: "4px", lineHeight: 1.4 }}>{t.description}</p>}
                              <div style={{ display: "flex", gap: "8px", marginTop: "6px", fontSize: "10.5px", color: "var(--text-3)" }}>
                                {t.owner && <span>{t.owner}</span>}
                                {t.deadline && <span>{t.deadline}</span>}
                              </div>
                            </div>
                            {canEdit && (
                              <div style={{ display: "flex", flexDirection: "column", gap: "4px", flexShrink: 0 }}>
                                <FormSelect value={getTaskStatus(t)} onChange={(e) => setStatus(t.id, e.target.value)} style={{ padding: "2px 4px", fontSize: "10px" }}>
                                  {TASK_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                                </FormSelect>
                                <button onClick={() => deleteTask(t.id)} style={{ fontSize: "10px", color: "var(--text-3)", background: "transparent", border: "none", cursor: "pointer", padding: "2px 4px" }}>Delete</button>
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

        {/* Features — count + link */}
        {features.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1.5rem", padding: "10px 14px", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>Features</span>
            <Badge variant="accent">{features.length}</Badge>
            <Link href={`/product/features?project=${id}`} style={{ fontSize: "12px", color: "var(--accent-text)", textDecoration: "none", marginLeft: "auto" }}>
              View all features →
            </Link>
          </div>
        )}

        {/* GitHub Activity — shown when project has a repo_url */}
        {project.repo_url && <GitHubActivityPanel repoUrl={project.repo_url} />}
      </main>
      <Footer />
    </PageLayout>
  );
}
