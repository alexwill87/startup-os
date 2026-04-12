"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth, useMembers } from "@/lib/AuthProvider";
import { logActivity } from "@/lib/activity";
import {
  PageLayout, Topbar, PageTitle, KpiRow, KpiCard, Button, Badge, Footer,
  FormGroup, FormLabel, FormInput, FormTextarea, FormSelect,
} from "@/app/components/ui";

export default function V1IdeasPage() {
  const { user, member, canEdit } = useAuth();
  const members = useMembers();
  const [ideas, setIdeas] = useState([]);
  const [projects, setProjects] = useState([]);
  const [comments, setComments] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", project_id: "" });

  const activeMembers = members.filter((m) => m.status === "active" && m.role !== "observer");
  const threshold = Math.max(2, Math.ceil(activeMembers.length * 0.66));

  useEffect(() => {
    fetchAll();
    const sub = supabase
      .channel("v1_ideas_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_features_os" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_comments" }, fetchAll)
      .subscribe();
    return () => supabase.removeChannel(sub);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchAll() {
    const [{ data: feat }, { data: proj }, { data: cmts }] = await Promise.all([
      supabase.from("cockpit_features_os").select("*").eq("stage", "idea").order("created_at", { ascending: false }),
      supabase.from("cockpit_projects").select("*").eq("category", "product"),
      supabase.from("cockpit_comments").select("*").eq("entity_type", "idea"),
    ]);
    setIdeas(feat || []);
    setProjects(proj || []);
    const grouped = {};
    (cmts || []).forEach((c) => {
      if (!grouped[c.entity_id]) grouped[c.entity_id] = [];
      grouped[c.entity_id].push(c);
    });
    setComments(grouped);
    setLoading(false);
  }

  function getVotes(ideaId) {
    return new Set((comments[ideaId] || []).filter((c) => c.vote === "agree").map((c) => c.author_id)).size;
  }
  function hasVoted(ideaId) {
    return (comments[ideaId] || []).some((c) => c.author_id === user?.id && c.vote === "agree");
  }

  async function submitIdea(e) {
    e.preventDefault();
    if (!form.name.trim() || !user?.id) return;
    const { data: created, error } = await supabase
      .from("cockpit_features_os")
      .insert({
        name: form.name,
        description: form.description || null,
        project_id: form.project_id || null,
        stage: "idea",
        work_kind: "feature",
        status: "reflexion",
        category: "utile",
        created_by: member?.name || "Admin",
      })
      .select("id")
      .single();
    if (error || !created) {
      alert("Error: " + error?.message);
      return;
    }
    await supabase.from("cockpit_comments").insert({
      entity_type: "idea",
      entity_id: created.id,
      body: "I propose this idea.",
      vote: "agree",
      author_id: user.id,
    });
    logActivity("created", "idea", { title: form.name });
    setForm({ name: "", description: "", project_id: "" });
    setShowForm(false);
  }

  async function toggleVote(ideaId) {
    if (!user?.id) return;
    const existing = (comments[ideaId] || []).find((c) => c.author_id === user.id && c.vote === "agree");
    if (existing) {
      await supabase.from("cockpit_comments").delete().eq("id", existing.id);
    } else {
      await supabase.from("cockpit_comments").insert({
        entity_type: "idea",
        entity_id: ideaId,
        body: "I like this idea.",
        vote: "agree",
        author_id: user.id,
      });
    }
  }

  async function promoteToFeature(ideaId) {
    if (!confirm("Promote this idea to a full feature? The 5-step workflow will be activated.")) return;
    const { error } = await supabase.from("cockpit_features_os").update({ stage: "feature" }).eq("id", ideaId);
    if (error) {
      alert("Error: " + error.message);
      return;
    }
    logActivity("promoted", "idea", { title: "Promoted to feature" });
  }

  async function deleteIdea(ideaId) {
    if (!confirm("Delete this idea?")) return;
    await supabase.from("cockpit_comments").delete().eq("entity_type", "idea").eq("entity_id", ideaId);
    await supabase.from("cockpit_features_os").delete().eq("id", ideaId);
  }

  const total = ideas.length;
  const promotable = ideas.filter((i) => getVotes(i.id) >= threshold).length;
  const myVotes = ideas.filter((i) => hasVoted(i.id)).length;

  return (
    <PageLayout>
      <Topbar
        breadcrumb={["Product", "Ideas"]}
        actions={
          <>
            <Button variant="ghost" onClick={fetchAll}>Refresh</Button>
            {canEdit && <Button variant="primary" onClick={() => setShowForm(!showForm)}>{showForm ? "Close form" : "New Idea"}</Button>}
          </>
        }
      />
      <main style={{ flex: 1, padding: "1.5rem 1.75rem", overflowY: "auto", maxWidth: "1100px", width: "100%", margin: "0 auto" }}>
        <PageTitle
          title="Ideas"
          description={`Brainstorm pool — vote to promote an idea to a feature. ${threshold} votes needed.`}
        />

        <KpiRow>
          <KpiCard label="Total" value={String(total)} trend="ideas" variant="accent" />
          <KpiCard label="Promotable" value={String(promotable)} trend={`≥ ${threshold} votes`} variant="success" />
          <KpiCard label="My votes" value={String(myVotes)} trend="liked" variant="warn" />
          <KpiCard label="Threshold" value={String(threshold)} trend="to promote" variant="muted" />
        </KpiRow>

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
            <h3 style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)", marginBottom: "12px" }}>Submit a new idea</h3>
            <form onSubmit={submitIdea} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <FormGroup>
                <FormLabel>Idea title *</FormLabel>
                <FormInput type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="What if we..." required />
              </FormGroup>
              <FormGroup>
                <FormLabel>Description</FormLabel>
                <FormTextarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Explain the idea briefly..." />
              </FormGroup>
              <FormGroup>
                <FormLabel>Project (optional)</FormLabel>
                <FormSelect value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
                  <option value="">— No project</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </FormSelect>
              </FormGroup>
              <div style={{ display: "flex", gap: "8px" }}>
                <Button variant="primary" type="submit">Submit</Button>
                <Button variant="ghost" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </section>
        )}

        {loading ? (
          <p style={{ textAlign: "center", color: "var(--text-3)", padding: "2rem 0" }}>Loading...</p>
        ) : ideas.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--text-3)", padding: "2rem 0" }}>No ideas yet. Be the first to propose one.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {ideas.map((idea) => {
              const votes = getVotes(idea.id);
              const voted = hasVoted(idea.id);
              const canPromote = votes >= threshold;
              const proj = projects.find((p) => p.id === idea.project_id);
              return (
                <article
                  key={idea.id}
                  style={{
                    background: "var(--bg-2)",
                    border: "1px solid var(--border)",
                    borderLeft: `3px solid ${canPromote ? "var(--success)" : "var(--warn)"}`,
                    borderRadius: "var(--radius-lg)",
                    padding: "1rem 1.25rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)", margin: 0 }}>{idea.name}</h3>
                      {idea.description && <p style={{ fontSize: "12.5px", color: "var(--text-2)", margin: "4px 0 0", lineHeight: 1.5 }}>{idea.description}</p>}
                      <div style={{ display: "flex", gap: "12px", marginTop: "6px", fontSize: "11px", color: "var(--text-3)" }}>
                        {proj && <span>Project: <span style={{ color: "var(--text-2)" }}>{proj.name}</span></span>}
                        {idea.created_by && <span>By: <span style={{ color: "var(--text-2)" }}>{idea.created_by}</span></span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                      <Button variant={voted ? "accent" : "secondary"} onClick={() => toggleVote(idea.id)}>
                        {voted ? "Voted" : "Vote"} {votes}/{threshold}
                      </Button>
                      {canPromote && canEdit && <Button variant="primary" onClick={() => promoteToFeature(idea.id)}>Promote</Button>}
                      {canEdit && <Button variant="danger" onClick={() => deleteIdea(idea.id)}>Delete</Button>}
                    </div>
                  </div>
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
