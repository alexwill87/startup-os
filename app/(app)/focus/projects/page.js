"use client";

/**
 * V1 Projects page — Cockpit Design System v3.0
 *
 * Behavior preserved from V2 (app/(app)/cockpit-projects/page.js):
 *  - Propose / vote / lock / activate / complete / archive / delete workflow
 *  - Atomic vote via RPC submit_project_vote
 *  - Threshold = max(2, ceil(activeMembers × 0.66))
 *  - Why / How / What inline editing
 *  - Linked features auto-counted with progress
 *  - Comments per project
 *  - Realtime sync (cockpit_projects, cockpit_comments, cockpit_features_os)
 *  - Activity log on every action
 */

import { useState, useEffect, useMemo } from "react";
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

const STATUSES = [
  { id: "proposed", label: "Proposed", variant: "info", desc: "Awaiting votes" },
  { id: "approved", label: "Approved", variant: "info", desc: "Majority reached" },
  { id: "locked", label: "Locked", variant: "warn", desc: "Ready to start" },
  { id: "active", label: "Active", variant: "success", desc: "In progress" },
  { id: "completed", label: "Completed", variant: "neutral", desc: "Done" },
  { id: "archived", label: "Archived", variant: "neutral", desc: "Filed" },
];

const PRIORITIES = [
  { id: "critique", label: "Critical", variant: "danger" },
  { id: "haute", label: "High", variant: "warn" },
  { id: "moyenne", label: "Medium", variant: "neutral" },
  { id: "basse", label: "Low", variant: "neutral" },
];

function getStatus(id) {
  return STATUSES.find((s) => s.id === id) || STATUSES[0];
}
function getPriority(id) {
  return PRIORITIES.find((p) => p.id === id);
}

export default function V1ProjectsPage() {
  const { user, member, canEdit } = useAuth();
  const members = useMembers();
  const [projects, setProjects] = useState([]);
  const [features, setFeatures] = useState([]);
  const [comments, setComments] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [commentForm, setCommentForm] = useState({});
  const [editingComment, setEditingComment] = useState(null);
  const [editCommentValue, setEditCommentValue] = useState("");
  const [editingTitle, setEditingTitle] = useState(null);
  const [editTitleValue, setEditTitleValue] = useState("");
  const [filter, setFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created");
  const [form, setForm] = useState({
    name: "",
    why: "",
    how: "",
    what: "",
    responsible: "",
    controller: "",
    priority: "moyenne",
    repo_url: "",
    public_url: "",
  });

  const activeMembers = useMemo(
    () => members.filter((m) => m.status === "active" && m.role !== "observer"),
    [members]
  );
  const threshold = useMemo(
    () => Math.max(2, Math.ceil(activeMembers.length * 0.66)),
    [activeMembers]
  );

  useEffect(() => {
    fetchAll();
    const sub = supabase
      .channel("v1_projects_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_projects" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_comments" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_features_os" }, fetchAll)
      .subscribe();
    return () => supabase.removeChannel(sub);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchAll() {
    const [{ data: proj }, { data: feat }, { data: cmts }] = await Promise.all([
      supabase.from("cockpit_projects").select("*").order("created_at"),
      supabase.from("cockpit_features_os").select("*").order("name"),
      supabase.from("cockpit_comments").select("*").eq("entity_type", "project").order("created_at"),
    ]);
    setProjects(proj || []);
    setFeatures(feat || []);
    const grouped = {};
    (cmts || []).forEach((c) => {
      if (!grouped[c.entity_id]) grouped[c.entity_id] = [];
      grouped[c.entity_id].push(c);
    });
    setComments(grouped);
    setLoading(false);
    if (selectedProject) {
      const updated = (proj || []).find((p) => p.id === selectedProject.id);
      if (updated) setSelectedProject(updated);
    }
  }

  function getVoteCounts(projectId) {
    const cmts = comments[projectId] || [];
    return {
      agree: new Set(cmts.filter((c) => c.vote === "agree").map((c) => c.author_id)).size,
      disagree: new Set(cmts.filter((c) => c.vote === "disagree").map((c) => c.author_id)).size,
      neutral: new Set(cmts.filter((c) => c.vote === "neutral").map((c) => c.author_id)).size,
    };
  }
  function getUserVote(projectId) {
    const cmts = comments[projectId] || [];
    const userCmts = cmts.filter((c) => c.author_id === user?.id);
    return userCmts.length > 0 ? userCmts[userCmts.length - 1].vote : null;
  }
  function isApproved(projectId) {
    return getVoteCounts(projectId).agree >= threshold;
  }

  async function createProject(e) {
    e.preventDefault();
    if (!form.name.trim() || !user?.id) return;
    const { data: created, error } = await supabase
      .from("cockpit_projects")
      .insert({
        name: form.name,
        why: form.why || null,
        how: form.how || null,
        what: form.what || null,
        responsible: form.responsible || null,
        controller: form.controller || null,
        priority: form.priority,
        repo_url: form.repo_url || null,
        public_url: form.public_url || null,
        proposed_by: member?.name || "Admin",
      })
      .select("id")
      .single();
    if (error || !created?.id) {
      alert("Error creating project");
      return;
    }
    await supabase.from("cockpit_comments").insert({
      entity_type: "project",
      entity_id: created.id,
      body: "I propose this project.",
      vote: "agree",
      author_id: user.id,
    });
    logActivity("created", "project", { title: form.name });
    setForm({
      name: "",
      why: "",
      how: "",
      what: "",
      responsible: "",
      controller: "",
      priority: "moyenne",
      repo_url: "",
      public_url: "",
    });
    setShowForm(false);
  }

  async function submitVote(projectId, vote) {
    if (!user?.id) return;
    const { error } = await supabase.rpc("submit_project_vote", {
      p_project_id: projectId,
      p_vote: vote,
      p_author_id: user.id,
      p_threshold: threshold,
    });
    if (error) {
      alert("Vote error: " + error.message);
      return;
    }
    logActivity("voted", "project", { title: projects.find((p) => p.id === projectId)?.name });
  }

  async function addComment(projectId) {
    const cf = commentForm[projectId];
    const body = cf?.body?.trim() || null;
    const vote = cf?.vote || "neutral";
    if (!body && vote === "neutral") return;
    if (!user?.id) return;
    const { error } = await supabase.from("cockpit_comments").insert({
      entity_type: "project",
      entity_id: projectId,
      body,
      vote,
      author_id: user.id,
    });
    if (error) {
      alert("Error: " + error.message);
      return;
    }
    logActivity(body ? "commented" : "reacted", "project", { title: projects.find((p) => p.id === projectId)?.name });
    setCommentForm({ ...commentForm, [projectId]: { body: "", vote: "neutral" } });
  }

  async function updateComment(commentId, newBody) {
    if (!newBody.trim()) return;
    await supabase.from("cockpit_comments").update({ body: newBody.trim() }).eq("id", commentId);
    setEditingComment(null);
    setEditCommentValue("");
  }

  async function deleteComment(commentId, projectId) {
    await supabase.from("cockpit_comments").delete().eq("id", commentId);
    logActivity("deleted_comment", "project", { title: projects.find((p) => p.id === projectId)?.name });
  }

  async function setProjectStatus(projectId, status) {
    const updates = { status, updated_at: new Date().toISOString() };
    if (status === "locked") updates.locked_at = new Date().toISOString();
    const { error } = await supabase.from("cockpit_projects").update(updates).eq("id", projectId);
    if (error) {
      alert("Error: " + error.message);
      return;
    }
    logActivity(status, "project", { title: projects.find((p) => p.id === projectId)?.name });
  }

  async function deleteProject(projectId) {
    const proj = projects.find((p) => p.id === projectId);
    const pFeats = features.filter((f) => f.project_id === projectId);
    if (pFeats.length > 0) {
      alert(`Cannot delete: ${pFeats.length} linked features. Archive instead.`);
      return;
    }
    if (!confirm(`Delete project "${proj?.name}" ?`)) return;
    await supabase.from("cockpit_comments").delete().eq("entity_type", "project").eq("entity_id", projectId);
    const { error } = await supabase.from("cockpit_projects").delete().eq("id", projectId);
    if (error) {
      alert("Error: " + error.message);
      return;
    }
    logActivity("deleted", "project", { title: proj?.name });
  }

  async function updateProjectField(projectId, field, value) {
    const { error } = await supabase
      .from("cockpit_projects")
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq("id", projectId);
    if (error) alert("Error: " + error.message);
  }

  function getProjectFeatures(projectId) {
    return features.filter((f) => f.project_id === projectId);
  }
  function getProjectProgress(projectId) {
    const pf = getProjectFeatures(projectId);
    if (pf.length === 0) return 0;
    const total = pf.length * 5;
    const done = pf.reduce(
      (acc, f) =>
        acc + [f.step_1_done, f.step_2_done, f.step_3_done, f.step_4_done, f.step_5_done].filter(Boolean).length,
      0
    );
    return Math.round((done / total) * 100);
  }

  // ---- Stats ----
  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === "active" || p.status === "locked").length;
  const proposedProjects = projects.filter((p) => p.status === "proposed").length;
  const completedProjects = projects.filter((p) => p.status === "completed").length;
  const priorityOrder = { critique: 0, haute: 1, moyenne: 2, basse: 3 };
  const filtered = projects
    .filter((p) => {
      if (filter !== "all" && p.status !== filter) return false;
      if (ownerFilter !== "all" && p.responsible !== ownerFilter) return false;
      if (priorityFilter !== "all" && p.priority !== priorityFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "priority") return (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9);
      if (sortBy === "updated") return new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at);
      return new Date(a.created_at) - new Date(b.created_at);
    });
  const memberOptions = activeMembers.map((m) => ({ value: m.name, label: m.name }));
  const owners = [...new Set(projects.map((p) => p.responsible).filter(Boolean))];

  return (
    <PageLayout>
      <Topbar
        breadcrumb={["Focus", "Projects"]}
        actions={
          <>
            <Button variant="ghost" onClick={fetchAll}>Refresh</Button>
            {canEdit && (
              <Button variant="primary" onClick={() => setShowForm(!showForm)}>
                {showForm ? "Close form" : "Propose Project"}
              </Button>
            )}
          </>
        }
      />
      <main style={{ flex: 1, padding: "1.5rem 1.75rem", overflowY: "auto", maxWidth: "1100px", width: "100%", margin: "0 auto" }}>
        <PageTitle
          title="Projects"
          description={`Strategic initiatives with Why/How/What. Workflow: Propose → Vote ${threshold}/3 → Lock → Activate → Complete.`}
        />

        <KpiRow>
          <KpiCard label="Total" value={String(totalProjects)} trend="projects" variant="accent" />
          <KpiCard label="Active" value={String(activeProjects)} trend="in progress" variant="success" />
          <KpiCard label="Voting" value={String(proposedProjects)} trend="awaiting votes" variant="warn" />
          <KpiCard label="Completed" value={String(completedProjects)} trend="archived soon" variant="muted" />
        </KpiRow>

        {/* Filters */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "0.5rem" }}>
          {[{ id: "all", label: "All", count: totalProjects }, ...STATUSES.map((s) => ({ ...s, count: projects.filter((p) => p.status === s.id).length }))].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                padding: "5px 11px",
                borderRadius: "var(--radius)",
                border: "1px solid var(--border)",
                background: filter === f.id ? "var(--bg-3)" : "transparent",
                color: filter === f.id ? "var(--text)" : "var(--text-3)",
                fontSize: "12px",
                fontWeight: 500,
                cursor: "pointer",
                transition: "background 0.12s, color 0.12s",
              }}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>

        {/* Secondary filters: Owner, Priority, Sort */}
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "1rem", alignItems: "center" }}>
          {/* Owner */}
          {owners.length > 0 && (
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <span style={{ fontSize: "11px", color: "var(--text-3)", fontWeight: 600 }}>Owner:</span>
              {[{ id: "all", label: "All" }, ...owners.map((o) => ({ id: o, label: o }))].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setOwnerFilter(f.id)}
                  style={{
                    padding: "4px 10px", borderRadius: "var(--radius)",
                    border: "1px solid var(--border)",
                    background: ownerFilter === f.id ? "var(--bg-3)" : "transparent",
                    color: ownerFilter === f.id ? "var(--text)" : "var(--text-3)",
                    fontSize: "12px", fontWeight: 500, cursor: "pointer",
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {/* Priority */}
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <span style={{ fontSize: "11px", color: "var(--text-3)", fontWeight: 600 }}>Priority:</span>
            {[{ id: "all", label: "All" }, ...PRIORITIES].map((f) => (
              <button
                key={f.id}
                onClick={() => setPriorityFilter(f.id)}
                style={{
                  padding: "4px 10px", borderRadius: "var(--radius)",
                  border: "1px solid var(--border)",
                  background: priorityFilter === f.id ? "var(--bg-3)" : "transparent",
                  color: priorityFilter === f.id ? "var(--text)" : "var(--text-3)",
                  fontSize: "12px", fontWeight: 500, cursor: "pointer",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <span style={{ fontSize: "11px", color: "var(--text-3)", fontWeight: 600 }}>Sort:</span>
            {[
              { id: "created", label: "Created" },
              { id: "updated", label: "Updated" },
              { id: "priority", label: "Priority" },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setSortBy(s.id)}
                style={{
                  padding: "4px 10px", borderRadius: "var(--radius)",
                  border: "1px solid var(--border)",
                  background: sortBy === s.id ? "var(--bg-3)" : "transparent",
                  color: sortBy === s.id ? "var(--text)" : "var(--text-3)",
                  fontSize: "12px", fontWeight: 500, cursor: "pointer",
                }}
              >
                {s.label}
              </button>
            ))}
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
              Propose a new project
            </h3>
            <form onSubmit={createProject} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <FormGroup>
                <FormLabel>Project name *</FormLabel>
                <FormInput
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Auth & Onboarding"
                  required
                />
              </FormGroup>
              <details style={{ fontSize: "12px", color: "var(--text-3)" }}>
                <summary style={{ cursor: "pointer" }}>Optional details (can be added later)</summary>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                    <FormGroup>
                      <FormLabel>Responsible</FormLabel>
                      <FormSelect value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value })}>
                        <option value="">—</option>
                        {memberOptions.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </FormSelect>
                    </FormGroup>
                    <FormGroup>
                      <FormLabel>Controller</FormLabel>
                      <FormSelect value={form.controller} onChange={(e) => setForm({ ...form, controller: e.target.value })}>
                        <option value="">—</option>
                        {memberOptions.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </FormSelect>
                    </FormGroup>
                    <FormGroup>
                      <FormLabel>Priority</FormLabel>
                      <FormSelect value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                        {PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                      </FormSelect>
                    </FormGroup>
                  </div>
                  <FormGroup>
                    <FormLabel>Why — Why this project?</FormLabel>
                    <FormTextarea rows={2} value={form.why} onChange={(e) => setForm({ ...form, why: e.target.value })} placeholder="What problem it solves, why it matters..." />
                  </FormGroup>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <FormGroup>
                      <FormLabel>How — How we do it?</FormLabel>
                      <FormTextarea rows={2} value={form.how} onChange={(e) => setForm({ ...form, how: e.target.value })} placeholder="Technical approach, key steps..." />
                    </FormGroup>
                    <FormGroup>
                      <FormLabel>What — What we deliver?</FormLabel>
                      <FormTextarea rows={2} value={form.what} onChange={(e) => setForm({ ...form, what: e.target.value })} placeholder="Concrete deliverables, expected outcome..." />
                    </FormGroup>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <FormGroup>
                      <FormLabel>Repository URL</FormLabel>
                      <FormInput type="url" value={form.repo_url} onChange={(e) => setForm({ ...form, repo_url: e.target.value })} placeholder="https://github.com/..." />
                    </FormGroup>
                    <FormGroup>
                      <FormLabel>Public URL</FormLabel>
                      <FormInput type="url" value={form.public_url} onChange={(e) => setForm({ ...form, public_url: e.target.value })} placeholder="https://..." />
                    </FormGroup>
                  </div>
                </div>
              </details>
              <div style={{ display: "flex", gap: "8px" }}>
                <Button variant="primary" type="submit">Propose</Button>
                <Button variant="ghost" onClick={() => setShowForm(false)} type="button">Cancel</Button>
              </div>
            </form>
          </section>
        )}

        {/* Project list */}
        {loading ? (
          <p style={{ textAlign: "center", color: "var(--text-3)", padding: "2rem 0" }}>Loading...</p>
        ) : filtered.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--text-3)", padding: "2rem 0" }}>No projects found.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {filtered.map((project) => {
              const st = getStatus(project.status);
              const pri = getPriority(project.priority);
              const votes = getVoteCounts(project.id);
              const approved = isApproved(project.id);
              const userVote = getUserVote(project.id);
              const pFeatures = getProjectFeatures(project.id);
              const progress = getProjectProgress(project.id);
              const projectComments = comments[project.id] || [];
              const expanded = selectedProject?.id === project.id;

              return (
                <article
                  key={project.id}
                  style={{
                    background: "var(--bg-2)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-lg)",
                    padding: "1rem 1.25rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
                    <div
                      style={{ flex: 1, cursor: "pointer", minWidth: 0 }}
                      onClick={() => setSelectedProject(expanded ? null : project)}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        {editingTitle === project.id ? (
                          <input
                            type="text"
                            value={editTitleValue}
                            onChange={(e) => setEditTitleValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                updateProjectField(project.id, "name", editTitleValue.trim());
                                setEditingTitle(null);
                              }
                              if (e.key === "Escape") setEditingTitle(null);
                            }}
                            onBlur={() => {
                              if (editTitleValue.trim() && editTitleValue.trim() !== project.name) {
                                updateProjectField(project.id, "name", editTitleValue.trim());
                              }
                              setEditingTitle(null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                            style={{
                              fontSize: "16px", fontWeight: 700, color: "var(--text)",
                              background: "var(--bg-3)", border: "1px solid var(--accent)",
                              borderRadius: "var(--radius)", padding: "2px 8px",
                              outline: "none", minWidth: "200px",
                            }}
                          />
                        ) : (
                          <h3
                            style={{ fontSize: "16px", fontWeight: 700, color: "var(--text)", margin: 0, cursor: canEdit ? "pointer" : "default" }}
                            onClick={(e) => {
                              if (!canEdit) return;
                              e.stopPropagation();
                              setEditingTitle(project.id);
                              setEditTitleValue(project.name);
                            }}
                            title={canEdit ? "Click to edit title" : ""}
                          >
                            {project.name}
                          </h3>
                        )}
                        <Badge variant={st.variant}>{st.label}</Badge>
                        {pri && (
                          canEdit ? (
                            <select
                              value={project.priority}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                e.stopPropagation();
                                updateProjectField(project.id, "priority", e.target.value);
                              }}
                              style={{
                                fontSize: "11px", fontWeight: 600, padding: "2px 8px",
                                borderRadius: "var(--radius)", border: "1px solid var(--border)",
                                background: `var(--${pri.variant}-bg, var(--bg-3))`,
                                color: `var(--${pri.variant})`,
                                cursor: "pointer", appearance: "auto",
                              }}
                            >
                              {PRIORITIES.map((p) => (
                                <option key={p.id} value={p.id}>{p.label}</option>
                              ))}
                            </select>
                          ) : (
                            <Badge variant={pri.variant}>{pri.label}</Badge>
                          )
                        )}
                      </div>
                      {project.why && (
                        <p style={{ fontSize: "12.5px", color: "var(--text-2)", marginTop: "4px", lineHeight: 1.5 }}>
                          {project.why}
                        </p>
                      )}
                      <div style={{ display: "flex", gap: "12px", marginTop: "6px", fontSize: "11px", color: "var(--text-3)", flexWrap: "wrap" }}>
                        {project.responsible && <span>Resp: <span style={{ color: "var(--text-2)" }}>{project.responsible}</span></span>}
                        {project.controller && <span>Ctrl: <span style={{ color: "var(--text-2)" }}>{project.controller}</span></span>}
                        <span>Features: <span style={{ color: "var(--text-2)" }}>{pFeatures.length}</span></span>
                        {pFeatures.length > 0 && (
                          <span>Progress: <span style={{ color: progress >= 80 ? "var(--success)" : progress >= 40 ? "var(--warn)" : "var(--text-2)" }}>{progress}%</span></span>
                        )}
                        {project.repo_url && (
                          <a href={project.repo_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: "var(--accent-text)" }}>
                            Repo
                          </a>
                        )}
                        {project.public_url && (
                          <a href={project.public_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: "var(--success-text)" }}>
                            Live
                          </a>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px", flexShrink: 0 }}>
                      {/* Votes */}
                      <div style={{ display: "flex", gap: "6px" }}>
                        {["agree", "disagree", "neutral"].map((v) => {
                          const canVote = canEdit && project.status === "proposed";
                          const isUserVote = userVote === v;
                          const labels = { agree: "Agree", disagree: "Disagree", neutral: "Neutral" };
                          const variants = { agree: "success", disagree: "danger", neutral: "neutral" };
                          return (
                            <button
                              key={v}
                              onClick={() => canVote && submitVote(project.id, v)}
                              disabled={!canVote}
                              style={{
                                padding: "3px 9px",
                                borderRadius: "20px",
                                fontSize: "12px",
                                fontWeight: 500,
                                cursor: canVote ? "pointer" : "default",
                                opacity: !canVote ? 0.4 : 1,
                                background: variants[v] === "success" ? "var(--success-bg)" : variants[v] === "danger" ? "var(--danger-bg)" : "var(--bg-3)",
                                color: variants[v] === "success" ? "var(--success)" : variants[v] === "danger" ? "var(--danger)" : "var(--text-2)",
                                border: isUserVote ? "1px solid var(--text)" : "1px solid transparent",
                              }}
                            >
                              {labels[v]} {votes[v]}
                            </button>
                          );
                        })}
                      </div>
                      <span style={{ fontSize: "10px", color: "var(--text-3)" }}>
                        {votes.agree}/{threshold} to approve
                      </span>

                      {/* Status transitions */}
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                        {(approved || project.status === "approved") && project.status !== "locked" && project.status !== "active" && canEdit && (
                          <Button variant="secondary" onClick={() => setProjectStatus(project.id, "locked")}>Lock</Button>
                        )}
                        {project.status === "locked" && canEdit && (
                          <Button variant="accent" onClick={() => setProjectStatus(project.id, "active")}>Activate</Button>
                        )}
                        {project.status === "active" && canEdit && (
                          <Button variant="secondary" onClick={() => setProjectStatus(project.id, "completed")}>Complete</Button>
                        )}
                        {(project.status === "completed" || project.status === "proposed") && canEdit && (
                          <Button variant="ghost" onClick={() => setProjectStatus(project.id, "archived")}>Archive</Button>
                        )}
                        {project.status === "proposed" && canEdit && (
                          <Button variant="danger" onClick={() => deleteProject(project.id)}>Delete</Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {pFeatures.length > 0 && (
                    <div style={{ marginTop: "12px" }}>
                      <div style={{ width: "100%", height: "4px", background: "var(--bg-3)", borderRadius: "2px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${progress}%`, background: "var(--success)", transition: "width 0.3s" }} />
                      </div>
                    </div>
                  )}

                  {/* Feed preview — always visible */}
                  {!expanded && projectComments.length > 0 && (
                    <div style={{ marginTop: "10px", paddingTop: "8px", borderTop: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ fontSize: "11px", color: "var(--text-3)" }}>
                          {projectComments.length} message{projectComments.length > 1 ? "s" : ""}
                        </span>
                        {projectComments.slice(-3).map((c) => {
                          const am = members.find((m) => m.user_id === c.author_id);
                          const typeColor = c.vote === "agree" ? "var(--success)" : c.vote === "disagree" ? "var(--danger)" : "var(--text-3)";
                          return (
                            <span key={c.id} style={{ fontSize: "11px", color: "var(--text-2)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              <span style={{ color: typeColor, fontWeight: 600 }}>{am?.name?.split(" ")[0] || "?"}</span>
                              {c.body ? `: ${c.body}` : ""}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Expanded detail */}
                  {expanded && (
                    <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "1rem" }}>
                      {/* Why / How / What */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                        {[
                          { key: "why", label: "Why" },
                          { key: "how", label: "How" },
                          { key: "what", label: "What" },
                        ].map((field) => (
                          <EditableField
                            key={field.key}
                            label={field.label}
                            value={project[field.key]}
                            canEdit={canEdit}
                            onSave={(v) => updateProjectField(project.id, field.key, v)}
                          />
                        ))}
                      </div>

                      {/* Links */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                        <EditableField label="Repository" value={project.repo_url} canEdit={canEdit} onSave={(v) => updateProjectField(project.id, "repo_url", v)} />
                        <EditableField label="Public URL" value={project.public_url} canEdit={canEdit} onSave={(v) => updateProjectField(project.id, "public_url", v)} />
                      </div>

                      {/* Quick actions: new task, new feature */}
                      {canEdit && (
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          <Link
                            href={`/focus/tasks?project=${project.id}&new=1`}
                            onClick={(e) => e.stopPropagation()}
                            style={{ textDecoration: "none" }}
                          >
                            <Button variant="secondary">+ Task</Button>
                          </Link>
                          <Link
                            href={`/product/features?project=${project.id}&new=1`}
                            onClick={(e) => e.stopPropagation()}
                            style={{ textDecoration: "none" }}
                          >
                            <Button variant="secondary">+ Feature</Button>
                          </Link>
                        </div>
                      )}

                      {/* Linked features — count + link */}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "11px", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>
                          Features
                        </span>
                        <Badge variant={pFeatures.length > 0 ? "accent" : "neutral"}>{pFeatures.length}</Badge>
                        {pFeatures.length > 0 && (
                          <Link
                            href={`/product/features?project=${project.id}`}
                            onClick={(e) => e.stopPropagation()}
                            style={{ fontSize: "11px", color: "var(--accent-text)", textDecoration: "none" }}
                          >
                            View all →
                          </Link>
                        )}
                      </div>

                      {/* GitHub Activity */}
                      {project.repo_url && <GitHubActivityPanel repoUrl={project.repo_url} />}

                      {/* Activity Feed */}
                      <div>
                        <span style={{ fontSize: "11px", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>
                          Activity ({projectComments.length})
                        </span>
                        {projectComments.length > 0 && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px", maxHeight: "350px", overflowY: "auto" }}>
                            {projectComments.map((c) => {
                              const am = members.find((m) => m.user_id === c.author_id);
                              const isOwn = user && c.author_id === user.id;
                              const isEditingThis = editingComment === c.id;
                              const typeLabel = c.vote === "agree" ? "Success" : c.vote === "disagree" ? "Issue" : "Comment";
                              const typeVariant = c.vote === "agree" ? "success" : c.vote === "disagree" ? "danger" : "neutral";
                              return (
                                <div key={c.id} style={{ display: "flex", gap: "8px", alignItems: "flex-start", fontSize: "12.5px" }}>
                                  <Badge variant={typeVariant}>{typeLabel}</Badge>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    {isEditingThis ? (
                                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                        <FormInput
                                          type="text"
                                          value={editCommentValue}
                                          onChange={(e) => setEditCommentValue(e.target.value)}
                                          onKeyDown={(e) => e.key === "Enter" && updateComment(c.id, editCommentValue)}
                                          autoFocus
                                        />
                                        <Button variant="primary" onClick={() => updateComment(c.id, editCommentValue)}>Save</Button>
                                        <Button variant="ghost" onClick={() => { setEditingComment(null); setEditCommentValue(""); }}>Cancel</Button>
                                      </div>
                                    ) : (
                                      <>
                                        {c.body && <p style={{ color: "var(--text-2)", margin: 0, lineHeight: 1.5 }}>{c.body}</p>}
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: c.body ? "3px" : 0 }}>
                                          <span style={{ fontSize: "11px", color: "var(--text-3)" }}>
                                            {am?.name || "Unknown"} — {new Date(c.created_at).toLocaleDateString()}
                                          </span>
                                          {isOwn && (
                                            <>
                                              {c.body && (
                                                <button onClick={() => { setEditingComment(c.id); setEditCommentValue(c.body); }}
                                                  style={{ fontSize: "11px", color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                                                  Edit
                                                </button>
                                              )}
                                              <button onClick={() => deleteComment(c.id, project.id)}
                                                style={{ fontSize: "11px", color: "var(--danger)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                                                Delete
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Post form: type buttons + optional text */}
                        {canEdit && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px", paddingTop: "10px", borderTop: "1px solid var(--border)" }}>
                            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                              <span style={{ fontSize: "11px", color: "var(--text-3)" }}>Quick:</span>
                              {[
                                { vote: "agree", label: "Success", variant: "success" },
                                { vote: "disagree", label: "Issue", variant: "danger" },
                              ].map((t) => (
                                <button
                                  key={t.vote}
                                  onClick={async () => {
                                    await supabase.from("cockpit_comments").insert({
                                      entity_type: "project", entity_id: project.id,
                                      body: null, vote: t.vote, author_id: user?.id,
                                    });
                                    logActivity("reacted", "project", { title: project.name, type: t.label });
                                  }}
                                  style={{
                                    fontSize: "12px", fontWeight: 600, padding: "4px 12px",
                                    borderRadius: "var(--radius)", border: "1px solid var(--border)",
                                    background: "var(--bg-3)", color: `var(--${t.variant})`, cursor: "pointer",
                                  }}
                                >
                                  {t.label}
                                </button>
                              ))}
                            </div>
                            <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
                              <FormGroup>
                                <FormLabel>Type</FormLabel>
                                <FormSelect
                                  value={commentForm[project.id]?.vote || "neutral"}
                                  onChange={(e) =>
                                    setCommentForm({
                                      ...commentForm,
                                      [project.id]: { ...commentForm[project.id], vote: e.target.value },
                                    })
                                  }
                                >
                                  <option value="neutral">Comment</option>
                                  <option value="agree">Success</option>
                                  <option value="disagree">Issue</option>
                                </FormSelect>
                              </FormGroup>
                              <FormGroup className="flex-1">
                                <FormLabel>Message</FormLabel>
                                <FormInput
                                  type="text"
                                  placeholder="Share an update, ask a question..."
                                  value={commentForm[project.id]?.body || ""}
                                  onChange={(e) =>
                                    setCommentForm({
                                      ...commentForm,
                                      [project.id]: { ...commentForm[project.id], body: e.target.value },
                                    })
                                  }
                                  onKeyDown={(e) => e.key === "Enter" && addComment(project.id)}
                                />
                              </FormGroup>
                              <Button variant="accent" onClick={() => addComment(project.id)}>Send</Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </PageLayout>
  );
}

function EditableField({ label, value, canEdit, onSave }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value || "");

  function save() {
    onSave(text || null);
    setEditing(false);
  }

  if (editing) {
    return (
      <div>
        <span style={{ fontSize: "11px", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>
          {label}
        </span>
        <FormTextarea rows={3} value={text} onChange={(e) => setText(e.target.value)} autoFocus />
        <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
          <Button variant="primary" onClick={save}>OK</Button>
          <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => canEdit && setEditing(true)}
      style={{
        cursor: canEdit ? "pointer" : "default",
        padding: "8px",
        margin: "-8px",
        borderRadius: "var(--radius)",
        transition: "background 0.12s",
      }}
      onMouseEnter={(e) => canEdit && (e.currentTarget.style.background = "var(--bg-3)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <span style={{ fontSize: "11px", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>
        {label}
      </span>
      {value ? (
        <p style={{ fontSize: "12.5px", color: "var(--text-2)", marginTop: "4px", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{value}</p>
      ) : (
        <p style={{ fontSize: "11px", color: "var(--text-3)", marginTop: "4px", fontStyle: "italic" }}>
          {canEdit ? "Click to define..." : "Not defined"}
        </p>
      )}
    </div>
  );
}
