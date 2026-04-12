"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import {
  PageLayout, Topbar, PageTitle, KpiRow, KpiCard, Button, Badge, Footer,
  FormGroup, FormLabel, FormInput,
} from "@/app/components/ui";

export default function ResourcesPage() {
  const { user } = useAuth();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", url: "", description: "", category: "link" });

  useEffect(() => {
    fetchResources();
    const sub = supabase.channel("my_resources_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_resources" }, fetchResources)
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  async function fetchResources() {
    const { data } = await supabase.from("cockpit_resources").select("*").order("created_at", { ascending: false });
    setResources(data || []);
    setLoading(false);
  }

  async function addResource(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    await supabase.from("cockpit_resources").insert({
      title: form.title, url: form.url || null, description: form.description || null,
      category: form.category, builder: user?.email || "unknown",
    });
    setForm({ title: "", url: "", description: "", category: "link" });
    setShowForm(false);
  }

  async function deleteResource(id) {
    if (!confirm("Delete this resource?")) return;
    await supabase.from("cockpit_resources").delete().eq("id", id);
  }

  const categories = [...new Set(resources.map((r) => r.category).filter(Boolean))];

  return (
    <PageLayout>
      <Topbar breadcrumb={["Me", "Resources"]} actions={
        <Button variant="primary" onClick={() => setShowForm(!showForm)}>{showForm ? "Close" : "Add Resource"}</Button>
      } />
      <main style={{ flex: 1, padding: "1.5rem 1.75rem", overflowY: "auto", maxWidth: "1100px", width: "100%", margin: "0 auto" }}>
        <PageTitle title="Resources" description="Bookmarks, links, tools, and files for the project." />

        <KpiRow>
          <KpiCard label="Total" value={String(resources.length)} variant="accent" />
          <KpiCard label="Categories" value={String(categories.length)} variant="default" />
        </KpiRow>

        {showForm && (
          <section style={{ padding: "1.25rem 1.5rem", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", marginBottom: "1rem" }}>
            <form onSubmit={addResource} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>
                <FormGroup><FormLabel>Title *</FormLabel><FormInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></FormGroup>
                <FormGroup><FormLabel>Category</FormLabel><FormInput value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="link, tool, doc..." /></FormGroup>
              </div>
              <FormGroup><FormLabel>URL</FormLabel><FormInput type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." /></FormGroup>
              <FormGroup><FormLabel>Description</FormLabel><FormInput value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What is this?" /></FormGroup>
              <div style={{ display: "flex", gap: "8px" }}><Button variant="primary" type="submit">Save</Button><Button variant="ghost" type="button" onClick={() => setShowForm(false)}>Cancel</Button></div>
            </form>
          </section>
        )}

        {loading ? <p style={{ textAlign: "center", color: "var(--text-3)", padding: "2rem 0" }}>Loading...</p> : resources.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--text-3)", padding: "2rem 0" }}>No resources yet. Add links, tools, docs.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {resources.map((r) => (
              <article key={r.id} style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>{r.title}</span>
                    {r.category && <Badge variant="neutral">{r.category}</Badge>}
                  </div>
                  {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "11.5px", color: "var(--accent-text)", textDecoration: "none", display: "block", marginBottom: "4px" }}>{r.url}</a>}
                  {r.description && <p style={{ fontSize: "12px", color: "var(--text-3)", margin: 0 }}>{r.description}</p>}
                </div>
                <Button variant="danger" onClick={() => deleteResource(r.id)}>Delete</Button>
              </article>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </PageLayout>
  );
}
