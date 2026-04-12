"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import { logActivity } from "@/lib/activity";
import {
  PageLayout, Topbar, PageTitle, KpiRow, KpiCard, Button, Badge, Footer,
  FormGroup, FormLabel, FormInput, FormTextarea, FormSelect,
} from "@/app/components/ui";

const TYPES = [
  { id: "improvement", label: "Improvement", variant: "info" },
  { id: "bug", label: "Bug", variant: "danger" },
  { id: "feature", label: "Feature Request", variant: "success" },
  { id: "question", label: "Question", variant: "warn" },
];

const STATUSES = [
  { id: "new", label: "New", variant: "neutral" },
  { id: "reviewed", label: "Reviewed", variant: "info" },
  { id: "planned", label: "Planned", variant: "warn" },
  { id: "deployed", label: "Deployed", variant: "success" },
  { id: "rejected", label: "Rejected", variant: "danger" },
];

export default function V1FeedbackPage() {
  const { user, member, isAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({ type: "improvement", title: "", body: "" });

  useEffect(() => {
    fetchFeedback();
    const sub = supabase
      .channel("v1_feedback_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_feedback" }, fetchFeedback)
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  async function fetchFeedback() {
    const { data } = await supabase
      .from("cockpit_feedback")
      .select("*")
      .order("votes", { ascending: false })
      .order("created_at", { ascending: false });
    setItems(data || []);
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    await supabase.from("cockpit_feedback").insert({
      type: form.type,
      title: form.title,
      body: form.body || null,
      author_id: user?.id,
      author_name: member?.name || "Unknown",
    });
    logActivity("created", "feedback", { title: form.title });
    setForm({ type: "improvement", title: "", body: "" });
    setShowForm(false);
  }

  async function updateStatus(id, status) {
    await supabase.from("cockpit_feedback").update({ status }).eq("id", id);
  }

  const filtered = filter === "all" ? items : items.filter((i) => i.status === filter);
  const newCount = items.filter((i) => i.status === "new" || !i.status).length;
  const plannedCount = items.filter((i) => i.status === "planned").length;
  const deployedCount = items.filter((i) => i.status === "deployed").length;

  return (
    <PageLayout>
      <Topbar
        breadcrumb={["Product", "Feedback"]}
        actions={
          <>
            <Button variant="ghost" onClick={fetchFeedback}>Refresh</Button>
            <Button variant="primary" onClick={() => setShowForm(!showForm)}>{showForm ? "Close form" : "New Feedback"}</Button>
          </>
        }
      />
      <main style={{ flex: 1, padding: "1.5rem 1.75rem", overflowY: "auto", maxWidth: "1100px", width: "100%", margin: "0 auto" }}>
        <PageTitle title="Feedback" description="Bugs, improvements, feature requests, questions from users." />

        <KpiRow>
          <KpiCard label="Total" value={String(items.length)} trend="items" variant="accent" />
          <KpiCard label="New" value={String(newCount)} trend="to review" variant="warn" />
          <KpiCard label="Planned" value={String(plannedCount)} trend="upcoming" variant="info" />
          <KpiCard label="Deployed" value={String(deployedCount)} trend="shipped" variant="success" />
        </KpiRow>

        {showForm && (
          <section style={{ padding: "1.25rem 1.5rem", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)", marginBottom: "12px" }}>Submit feedback</h3>
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <FormGroup>
                <FormLabel>Type</FormLabel>
                <FormSelect value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </FormSelect>
              </FormGroup>
              <FormGroup>
                <FormLabel>Title *</FormLabel>
                <FormInput type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </FormGroup>
              <FormGroup>
                <FormLabel>Description</FormLabel>
                <FormTextarea rows={3} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
              </FormGroup>
              <div style={{ display: "flex", gap: "8px" }}>
                <Button variant="primary" type="submit">Submit</Button>
                <Button variant="ghost" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </section>
        )}

        {/* Filters */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "1rem" }}>
          {[{ id: "all", label: "All" }, ...STATUSES].map((s) => (
            <button
              key={s.id}
              onClick={() => setFilter(s.id)}
              style={{
                padding: "5px 11px",
                borderRadius: "var(--radius)",
                border: "1px solid var(--border)",
                background: filter === s.id ? "var(--bg-3)" : "transparent",
                color: filter === s.id ? "var(--text)" : "var(--text-3)",
                fontSize: "12px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--text-3)", padding: "2rem 0" }}>No feedback yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {filtered.map((item) => {
              const type = TYPES.find((t) => t.id === item.type) || TYPES[0];
              const status = STATUSES.find((s) => s.id === (item.status || "new")) || STATUSES[0];
              return (
                <article
                  key={item.id}
                  style={{
                    background: "var(--bg-2)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-lg)",
                    padding: "1rem 1.25rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "6px" }}>
                        <Badge variant={type.variant}>{type.label}</Badge>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>
                      <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)", margin: 0 }}>{item.title}</h3>
                      {item.body && <p style={{ fontSize: "12.5px", color: "var(--text-2)", margin: "4px 0 0", lineHeight: 1.5 }}>{item.body}</p>}
                      <div style={{ display: "flex", gap: "12px", marginTop: "6px", fontSize: "11px", color: "var(--text-3)" }}>
                        {item.author_name && <span>By {item.author_name}</span>}
                        <span>{new Date(item.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px", flexShrink: 0 }}>
                      <span style={{ fontSize: "20px", fontWeight: 700, color: "var(--text)" }}>{item.votes || 0}</span>
                      <span style={{ fontSize: "10px", color: "var(--text-3)" }}>votes</span>
                      {isAdmin && (
                        <FormSelect value={item.status || "new"} onChange={(e) => updateStatus(item.id, e.target.value)}>
                          {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </FormSelect>
                      )}
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
