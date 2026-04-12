"use client";

/**
 * V1 Sprints — Cockpit Design System v3.0
 * Migration of app/(app)/focus/sprints/page.js — full behavior preserved.
 */

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth, useMembers } from "@/lib/AuthProvider";
import { logActivity } from "@/lib/activity";
import {
  PageLayout, Topbar, PageTitle, KpiRow, KpiCard, Button, Badge, Footer,
  FormGroup, FormLabel, FormInput, FormTextarea,
} from "@/app/components/ui";

function nextSunday10h() {
  const now = new Date();
  const day = now.getDay();
  let daysUntil = (7 - day) % 7;
  if (daysUntil === 0 && now.getHours() >= 10) daysUntil = 7;
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntil);
  next.setHours(10, 0, 0, 0);
  return next.toISOString().split("T")[0];
}

function daysLeft(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

function fmtDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yy} ${hh}:${mi}`;
}

export default function V1SprintsPage() {
  const { user, member, canEdit } = useAuth();
  const members = useMembers();
  const [sprints, setSprints] = useState([]);
  const [features, setFeatures] = useState([]);
  const [comments, setComments] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", start_date: "", end_date: nextSunday10h() });
  const [editingField, setEditingField] = useState(null); // "title:id" or "start:id" or "end:id"
  const [editFieldValue, setEditFieldValue] = useState("");

  const activeMembers = members.filter((m) => m.status === "active" && m.role !== "observer");
  const threshold = Math.max(2, Math.ceil(activeMembers.length * 0.66));

  useEffect(() => {
    fetchAll();
    const sub = supabase
      .channel("v1_sprints_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_sprints" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_comments" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_features_os" }, fetchAll)
      .subscribe();
    return () => supabase.removeChannel(sub);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchAll() {
    const [{ data: spr }, { data: feat }, { data: cmts }] = await Promise.all([
      supabase.from("cockpit_sprints").select("*").order("created_at", { ascending: false }),
      supabase.from("cockpit_features_os").select("*"),
      supabase.from("cockpit_comments").select("*").eq("entity_type", "sprint"),
    ]);
    setSprints(spr || []);
    setFeatures(feat || []);
    const grouped = {};
    (cmts || []).forEach((c) => {
      if (!grouped[c.entity_id]) grouped[c.entity_id] = [];
      grouped[c.entity_id].push(c);
    });
    setComments(grouped);
    setLoading(false);
  }

  function getVotes(sprintId) {
    return new Set((comments[sprintId] || []).filter((c) => c.vote === "agree").map((c) => c.author_id)).size;
  }
  function hasVoted(sprintId) {
    return (comments[sprintId] || []).some((c) => c.author_id === user?.id && c.vote === "agree");
  }

  async function createSprint(e) {
    e.preventDefault();
    if (!form.name.trim() || !user?.id) return;
    const { data: created, error } = await supabase
      .from("cockpit_sprints")
      .insert({
        name: form.name,
        description: form.description || null,
        start_date: form.start_date || new Date().toISOString().split("T")[0],
        end_date: form.end_date,
        proposed_by: member?.name || "Admin",
      })
      .select("id")
      .single();
    if (error || !created) {
      alert("Error: " + error?.message);
      return;
    }
    await supabase.from("cockpit_comments").insert({
      entity_type: "sprint",
      entity_id: created.id,
      body: "I propose this sprint.",
      vote: "agree",
      author_id: user.id,
    });
    logActivity("created", "sprint", { title: form.name });
    setForm({ name: "", description: "", start_date: "", end_date: nextSunday10h() });
    setShowForm(false);
  }

  async function toggleVote(sprintId) {
    if (!user?.id) return;
    const existing = (comments[sprintId] || []).find((c) => c.author_id === user.id && c.vote === "agree");
    if (existing) {
      await supabase.from("cockpit_comments").delete().eq("id", existing.id);
    } else {
      await supabase.from("cockpit_comments").insert({
        entity_type: "sprint",
        entity_id: sprintId,
        body: "I approve this sprint.",
        vote: "agree",
        author_id: user.id,
      });
      const votes = getVotes(sprintId);
      if (votes + 1 >= threshold) {
        await supabase.from("cockpit_sprints").update({ status: "approved", updated_at: new Date().toISOString() }).eq("id", sprintId);
      }
    }
  }

  async function updateStatus(sprintId, newStatus) {
    await supabase.from("cockpit_sprints").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", sprintId);
    logActivity(newStatus, "sprint", { title: sprints.find((s) => s.id === sprintId)?.name });
  }

  async function deleteSprint(id) {
    if (!confirm("Delete this sprint?")) return;
    await supabase.from("cockpit_comments").delete().eq("entity_type", "sprint").eq("entity_id", id);
    await supabase.from("cockpit_sprints").delete().eq("id", id);
  }

  async function updateSprintField(id, field, value) {
    await supabase.from("cockpit_sprints").update({ [field]: value, updated_at: new Date().toISOString() }).eq("id", id);
    setEditingField(null);
    setEditFieldValue("");
  }

  function startEdit(field, id, value) {
    setEditingField(`${field}:${id}`);
    setEditFieldValue(value || "");
  }

  function isEditing(field, id) {
    return editingField === `${field}:${id}`;
  }

  const activeSprint = sprints.find((s) => s.status === "active");
  const proposedSprints = sprints.filter((s) => s.status === "proposed");
  const approvedSprints = sprints.filter((s) => s.status === "approved");
  const pastSprints = sprints.filter((s) => s.status === "completed" || s.status === "cancelled");

  const cardStyle = {
    background: "var(--bg-2)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    padding: "1rem 1.25rem",
  };

  return (
    <PageLayout>
      <Topbar
        breadcrumb={["Focus", "Sprints"]}
        actions={
          <>
            <Button variant="ghost" onClick={fetchAll}>Refresh</Button>
            {canEdit && (
              <Button variant="primary" onClick={() => setShowForm(!showForm)}>
                {showForm ? "Close form" : "New Sprint"}
              </Button>
            )}
          </>
        }
      />
      <main style={{ flex: 1, padding: "1.5rem 1.75rem", overflowY: "auto", maxWidth: "1100px", width: "100%", margin: "0 auto" }}>
        <PageTitle
          title="Sprints"
          description={`Weekly rhythm — voted, locked, delivered. ${threshold} votes needed to approve.`}
        />

        <KpiRow>
          <KpiCard
            label="Active sprint"
            value={activeSprint ? (daysLeft(activeSprint.end_date) ?? "—") : "—"}
            trend={activeSprint ? "days left" : "none"}
            variant={activeSprint ? "success" : "muted"}
          />
          <KpiCard label="Proposed" value={String(proposedSprints.length)} trend="awaiting votes" variant="warn" />
          <KpiCard label="Approved" value={String(approvedSprints.length)} trend="ready to start" variant="accent" />
          <KpiCard label="Past" value={String(pastSprints.length)} trend="completed" variant="muted" />
        </KpiRow>

        {/* Active sprint */}
        {activeSprint && (
          <article style={{ ...cardStyle, borderLeft: "3px solid var(--success)", marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div style={{ flex: 1 }}>
                <Badge variant="success">Active sprint</Badge>
                {isEditing("title", activeSprint.id) ? (
                  <input type="text" value={editFieldValue} onChange={(e) => setEditFieldValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") updateSprintField(activeSprint.id, "name", editFieldValue.trim()); if (e.key === "Escape") setEditingField(null); }}
                    onBlur={() => { if (editFieldValue.trim()) updateSprintField(activeSprint.id, "name", editFieldValue.trim()); }}
                    autoFocus style={{ fontSize: "18px", fontWeight: 700, color: "var(--text)", background: "var(--bg-3)", border: "1px solid var(--accent)", borderRadius: "var(--radius)", padding: "2px 8px", outline: "none", width: "100%", margin: "8px 0 4px" }} />
                ) : (
                  <h2 onClick={() => canEdit && startEdit("title", activeSprint.id, activeSprint.name)}
                    style={{ fontSize: "18px", fontWeight: 700, color: "var(--text)", margin: "8px 0 4px", cursor: canEdit ? "pointer" : "default" }}
                    title={canEdit ? "Click to edit" : ""}>{activeSprint.name}</h2>
                )}
                {activeSprint.description && <p style={{ fontSize: "12.5px", color: "var(--text-2)", margin: 0 }}>{activeSprint.description}</p>}
                <div style={{ display: "flex", gap: "16px", marginTop: "8px", fontSize: "11px", color: "var(--text-3)", flexWrap: "wrap", alignItems: "center" }}>
                  <span>Start: {isEditing("start", activeSprint.id) ? (
                    <input type="datetime-local" value={editFieldValue} onChange={(e) => setEditFieldValue(e.target.value)}
                      onBlur={() => updateSprintField(activeSprint.id, "start_date", editFieldValue)}
                      onKeyDown={(e) => { if (e.key === "Enter") updateSprintField(activeSprint.id, "start_date", editFieldValue); }}
                      autoFocus style={{ fontSize: "11px", background: "var(--bg-3)", border: "1px solid var(--accent)", borderRadius: "var(--radius)", padding: "1px 4px", color: "var(--text-2)", outline: "none" }} />
                  ) : (
                    <span onClick={() => canEdit && startEdit("start", activeSprint.id, activeSprint.start_date ? new Date(activeSprint.start_date).toISOString().slice(0, 16) : "")}
                      style={{ color: "var(--text-2)", cursor: canEdit ? "pointer" : "default", borderBottom: canEdit ? "1px dashed var(--text-3)" : "none" }}>{fmtDate(activeSprint.start_date)}</span>
                  )}</span>
                  <span>End: {isEditing("end", activeSprint.id) ? (
                    <input type="datetime-local" value={editFieldValue} onChange={(e) => setEditFieldValue(e.target.value)}
                      onBlur={() => updateSprintField(activeSprint.id, "end_date", editFieldValue)}
                      onKeyDown={(e) => { if (e.key === "Enter") updateSprintField(activeSprint.id, "end_date", editFieldValue); }}
                      autoFocus style={{ fontSize: "11px", background: "var(--bg-3)", border: "1px solid var(--accent)", borderRadius: "var(--radius)", padding: "1px 4px", color: "var(--text-2)", outline: "none" }} />
                  ) : (
                    <span onClick={() => canEdit && startEdit("end", activeSprint.id, activeSprint.end_date ? new Date(activeSprint.end_date).toISOString().slice(0, 16) : "")}
                      style={{ color: "var(--text-2)", cursor: canEdit ? "pointer" : "default", borderBottom: canEdit ? "1px dashed var(--text-3)" : "none" }}>{fmtDate(activeSprint.end_date)}</span>
                  )}</span>
                  {activeSprint.end_date && <span>Days left: <span style={{ color: "var(--success)" }}>{daysLeft(activeSprint.end_date)}</span></span>}
                  <span>Features: <span style={{ color: "var(--text-2)" }}>{features.filter((f) => f.sprint_id === activeSprint.id).length}</span></span>
                </div>
              </div>
              {canEdit && <Button variant="secondary" onClick={() => updateStatus(activeSprint.id, "completed")}>Complete</Button>}
            </div>
          </article>
        )}

        {/* Create form */}
        {showForm && (
          <section style={{ ...cardStyle, marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)", marginBottom: "12px" }}>Propose a new sprint</h3>
            <form onSubmit={createSprint} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <FormGroup>
                <FormLabel>Sprint name *</FormLabel>
                <FormInput type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Sprint 2 — Build phase" required />
              </FormGroup>
              <FormGroup>
                <FormLabel>Goal</FormLabel>
                <FormTextarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What we want to accomplish this sprint..." />
              </FormGroup>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <FormGroup>
                  <FormLabel>Start date</FormLabel>
                  <FormInput type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                </FormGroup>
                <FormGroup>
                  <FormLabel>End date (deadline)</FormLabel>
                  <FormInput type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                </FormGroup>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <Button variant="primary" type="submit">Propose</Button>
                <Button variant="ghost" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </section>
        )}

        {/* Proposed */}
        {proposedSprints.length > 0 && (
          <div style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "10px" }}>
              Awaiting approval ({threshold} votes needed)
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {proposedSprints.map((s) => {
                const votes = getVotes(s.id);
                const voted = hasVoted(s.id);
                return (
                  <article key={s.id} style={cardStyle}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
                      <div style={{ flex: 1 }}>
                        {isEditing("title", s.id) ? (
                          <input type="text" value={editFieldValue} onChange={(e) => setEditFieldValue(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") updateSprintField(s.id, "name", editFieldValue.trim()); if (e.key === "Escape") setEditingField(null); }}
                            onBlur={() => { if (editFieldValue.trim()) updateSprintField(s.id, "name", editFieldValue.trim()); }}
                            autoFocus style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)", background: "var(--bg-3)", border: "1px solid var(--accent)", borderRadius: "var(--radius)", padding: "2px 8px", outline: "none", width: "100%" }} />
                        ) : (
                          <h3 onClick={() => canEdit && startEdit("title", s.id, s.name)}
                            style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)", margin: 0, cursor: canEdit ? "pointer" : "default" }}
                            title={canEdit ? "Click to edit" : ""}>{s.name}</h3>
                        )}
                        {s.description && <p style={{ fontSize: "12px", color: "var(--text-2)", margin: "4px 0 0" }}>{s.description}</p>}
                        <div style={{ display: "flex", gap: "16px", marginTop: "6px", fontSize: "11px", color: "var(--text-3)", flexWrap: "wrap", alignItems: "center" }}>
                          <span>Start: {isEditing("start", s.id) ? (
                            <input type="datetime-local" value={editFieldValue} onChange={(e) => setEditFieldValue(e.target.value)}
                              onBlur={() => updateSprintField(s.id, "start_date", editFieldValue)}
                              onKeyDown={(e) => { if (e.key === "Enter") updateSprintField(s.id, "start_date", editFieldValue); }}
                              autoFocus style={{ fontSize: "11px", background: "var(--bg-3)", border: "1px solid var(--accent)", borderRadius: "var(--radius)", padding: "1px 4px", color: "var(--text-2)", outline: "none" }} />
                          ) : (
                            <span onClick={() => canEdit && startEdit("start", s.id, s.start_date ? new Date(s.start_date).toISOString().slice(0, 16) : "")}
                              style={{ color: "var(--text-2)", cursor: canEdit ? "pointer" : "default", borderBottom: canEdit ? "1px dashed var(--text-3)" : "none" }}>{fmtDate(s.start_date)}</span>
                          )}</span>
                          <span>End: {isEditing("end", s.id) ? (
                            <input type="datetime-local" value={editFieldValue} onChange={(e) => setEditFieldValue(e.target.value)}
                              onBlur={() => updateSprintField(s.id, "end_date", editFieldValue)}
                              onKeyDown={(e) => { if (e.key === "Enter") updateSprintField(s.id, "end_date", editFieldValue); }}
                              autoFocus style={{ fontSize: "11px", background: "var(--bg-3)", border: "1px solid var(--accent)", borderRadius: "var(--radius)", padding: "1px 4px", color: "var(--text-2)", outline: "none" }} />
                          ) : (
                            <span onClick={() => canEdit && startEdit("end", s.id, s.end_date ? new Date(s.end_date).toISOString().slice(0, 16) : "")}
                              style={{ color: "var(--text-2)", cursor: canEdit ? "pointer" : "default", borderBottom: canEdit ? "1px dashed var(--text-3)" : "none" }}>{fmtDate(s.end_date)}</span>
                          )}</span>
                          {s.proposed_by && <span>By: <span style={{ color: "var(--text-2)" }}>{s.proposed_by}</span></span>}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Button variant={voted ? "accent" : "secondary"} onClick={() => toggleVote(s.id)}>
                          {voted ? "Voted" : "Vote"} {votes}/{threshold}
                        </Button>
                        {canEdit && <Button variant="danger" onClick={() => deleteSprint(s.id)}>Delete</Button>}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        {/* Approved waiting to start */}
        {approvedSprints.map((s) => (
          <article key={s.id} style={{ ...cardStyle, borderLeft: "3px solid var(--accent)", marginBottom: "10px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div style={{ flex: 1 }}>
                <Badge variant="info">Approved — ready to start</Badge>
                {isEditing("title", s.id) ? (
                  <input type="text" value={editFieldValue} onChange={(e) => setEditFieldValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") updateSprintField(s.id, "name", editFieldValue.trim()); if (e.key === "Escape") setEditingField(null); }}
                    onBlur={() => { if (editFieldValue.trim()) updateSprintField(s.id, "name", editFieldValue.trim()); }}
                    autoFocus style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)", background: "var(--bg-3)", border: "1px solid var(--accent)", borderRadius: "var(--radius)", padding: "2px 8px", outline: "none", width: "100%", margin: "8px 0 0" }} />
                ) : (
                  <h3 onClick={() => canEdit && startEdit("title", s.id, s.name)}
                    style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)", margin: "8px 0 0", cursor: canEdit ? "pointer" : "default" }}
                    title={canEdit ? "Click to edit" : ""}>{s.name}</h3>
                )}
                {s.description && <p style={{ fontSize: "12px", color: "var(--text-2)", margin: "4px 0 0" }}>{s.description}</p>}
                <div style={{ display: "flex", gap: "16px", marginTop: "6px", fontSize: "11px", color: "var(--text-3)", alignItems: "center" }}>
                  <span>Start: <span onClick={() => canEdit && startEdit("start", s.id, s.start_date ? new Date(s.start_date).toISOString().slice(0, 16) : "")}
                    style={{ color: "var(--text-2)", cursor: canEdit ? "pointer" : "default", borderBottom: canEdit ? "1px dashed var(--text-3)" : "none" }}>{fmtDate(s.start_date)}</span></span>
                  <span>End: <span onClick={() => canEdit && startEdit("end", s.id, s.end_date ? new Date(s.end_date).toISOString().slice(0, 16) : "")}
                    style={{ color: "var(--text-2)", cursor: canEdit ? "pointer" : "default", borderBottom: canEdit ? "1px dashed var(--text-3)" : "none" }}>{fmtDate(s.end_date)}</span></span>
                </div>
              </div>
              {canEdit && <Button variant="accent" onClick={() => updateStatus(s.id, "active")}>Start</Button>}
            </div>
          </article>
        ))}

        {/* Past sprints */}
        {pastSprints.length > 0 && (
          <div style={{ marginTop: "1.5rem" }}>
            <h3 style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "10px" }}>
              Past sprints
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {pastSprints.map((s) => (
                <article key={s.id} style={{ ...cardStyle, padding: "10px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ fontSize: "13px", color: "var(--text)" }}>{s.name}</span>
                      <span style={{ fontSize: "11px", color: "var(--text-3)" }}>{fmtDate(s.start_date)} → {fmtDate(s.end_date)}</span>
                    </div>
                    <Badge variant={s.status === "completed" ? "success" : "neutral"}>
                      {s.status === "completed" ? "Completed" : "Cancelled"}
                    </Badge>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {loading && <p style={{ textAlign: "center", color: "var(--text-3)", padding: "2rem 0" }}>Loading...</p>}
        {!loading && sprints.length === 0 && (
          <p style={{ textAlign: "center", color: "var(--text-3)", padding: "2rem 0" }}>
            No sprints yet. Create the first one to give rhythm to the work.
          </p>
        )}
      </main>
      <Footer />
    </PageLayout>
  );
}
