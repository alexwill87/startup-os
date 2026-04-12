"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import {
  PageLayout, Topbar, PageTitle, KpiRow, KpiCard, Button, Footer,
  FormGroup, FormLabel, FormInput, FormTextarea,
} from "@/app/components/ui";

export default function V1CompetitorsPage() {
  const { user, canEdit } = useAuth();
  const [competitors, setCompetitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", url: "", description: "" });

  useEffect(() => {
    fetchCompetitors();
  }, []);

  async function fetchCompetitors() {
    const { data } = await supabase
      .from("cockpit_resources")
      .select("*")
      .eq("category", "competitor")
      .order("created_at", { ascending: false });
    setCompetitors(data || []);
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    await supabase.from("cockpit_resources").insert({
      category: "competitor",
      title: form.name,
      url: form.url || null,
      description: form.description || null,
      builder: user?.email || "unknown",
    });
    setForm({ name: "", url: "", description: "" });
    setShowForm(false);
    fetchCompetitors();
  }

  async function deleteCompetitor(id) {
    if (!confirm("Delete this competitor?")) return;
    await supabase.from("cockpit_resources").delete().eq("id", id);
    fetchCompetitors();
  }

  return (
    <PageLayout>
      <Topbar
        breadcrumb={["Market", "Competitors"]}
        actions={
          <>
            <Button variant="ghost" onClick={fetchCompetitors}>Refresh</Button>
            {canEdit && <Button variant="primary" onClick={() => setShowForm(!showForm)}>{showForm ? "Close form" : "Add Competitor"}</Button>}
          </>
        }
      />
      <main style={{ flex: 1, padding: "1.5rem 1.75rem", overflowY: "auto", maxWidth: "1100px", width: "100%", margin: "0 auto" }}>
        <PageTitle title="Competitors" description="Competitive landscape — features, positioning, links." />

        <KpiRow>
          <KpiCard label="Total" value={String(competitors.length)} trend="competitors tracked" variant="accent" />
        </KpiRow>

        {showForm && canEdit && (
          <section style={{ padding: "1.25rem 1.5rem", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)", marginBottom: "12px" }}>Add a competitor</h3>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <FormGroup>
                <FormLabel>Name *</FormLabel>
                <FormInput type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </FormGroup>
              <FormGroup>
                <FormLabel>URL</FormLabel>
                <FormInput type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." />
              </FormGroup>
              <FormGroup>
                <FormLabel>Description / notes</FormLabel>
                <FormTextarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Strengths, weaknesses, pricing, positioning..." />
              </FormGroup>
              <div style={{ display: "flex", gap: "8px" }}>
                <Button variant="primary" type="submit">Save</Button>
                <Button variant="ghost" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </section>
        )}

        {loading ? (
          <p style={{ textAlign: "center", color: "var(--text-3)", padding: "2rem 0" }}>Loading...</p>
        ) : competitors.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--text-3)", padding: "2rem 0" }}>No competitors tracked yet.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "12px" }}>
            {competitors.map((c) => (
              <article
                key={c.id}
                style={{
                  background: "var(--bg-2)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  padding: "1.25rem 1.5rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px", marginBottom: "8px" }}>
                  <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--text)", margin: 0 }}>{c.title}</h3>
                  {canEdit && <Button variant="danger" onClick={() => deleteCompetitor(c.id)}>Delete</Button>}
                </div>
                {c.url && (
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: "11.5px", color: "var(--accent-text)", textDecoration: "none", display: "block", marginBottom: "8px" }}
                  >
                    {c.url}
                  </a>
                )}
                {c.description && (
                  <p style={{ fontSize: "12.5px", color: "var(--text-2)", margin: 0, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                    {c.description}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </PageLayout>
  );
}
