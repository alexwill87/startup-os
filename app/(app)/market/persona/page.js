"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import {
  PageLayout, Topbar, PageTitle, KpiRow, KpiCard, Button, Footer,
  FormGroup, FormLabel, FormInput, FormTextarea,
} from "@/app/components/ui";

export default function V1PersonaPage() {
  const { user, canEdit } = useAuth();
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", who: "", pain: "", willingness: "", platform: "" });

  useEffect(() => {
    fetchPersonas();
  }, []);

  async function fetchPersonas() {
    const { data } = await supabase
      .from("cockpit_vision")
      .select("*")
      .eq("topic", "market")
      .order("created_at", { ascending: false });
    setPersonas(data || []);
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    await supabase.from("cockpit_vision").insert({
      topic: "market",
      title: form.name,
      body: JSON.stringify(form),
      builder: user?.email || "unknown",
      pinned: false,
    });
    setForm({ name: "", who: "", pain: "", willingness: "", platform: "" });
    setShowForm(false);
    fetchPersonas();
  }

  async function deletePersona(id) {
    if (!confirm("Delete this persona?")) return;
    await supabase.from("cockpit_vision").delete().eq("id", id);
    fetchPersonas();
  }

  function parseBody(body) {
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  }

  return (
    <PageLayout>
      <Topbar
        breadcrumb={["Market", "Persona"]}
        actions={
          <>
            <Button variant="ghost" onClick={fetchPersonas}>Refresh</Button>
            {canEdit && <Button variant="primary" onClick={() => setShowForm(!showForm)}>{showForm ? "Close form" : "New Persona"}</Button>}
          </>
        }
      />
      <main style={{ flex: 1, padding: "1.5rem 1.75rem", overflowY: "auto", maxWidth: "1100px", width: "100%", margin: "0 auto" }}>
        <PageTitle title="Personas" description="Target customers with their needs, pain points, and platforms." />

        <KpiRow>
          <KpiCard label="Total" value={String(personas.length)} trend="personas" variant="accent" />
        </KpiRow>

        {showForm && canEdit && (
          <section style={{ padding: "1.25rem 1.5rem", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)", marginBottom: "12px" }}>Define a new persona</h3>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <FormGroup>
                <FormLabel>Name *</FormLabel>
                <FormInput type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Jane the Indie Founder" required />
              </FormGroup>
              <FormGroup>
                <FormLabel>Who are they?</FormLabel>
                <FormTextarea rows={2} value={form.who} onChange={(e) => setForm({ ...form, who: e.target.value })} placeholder="Age, role, context..." />
              </FormGroup>
              <FormGroup>
                <FormLabel>Pain point</FormLabel>
                <FormTextarea rows={2} value={form.pain} onChange={(e) => setForm({ ...form, pain: e.target.value })} placeholder="What hurts them..." />
              </FormGroup>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <FormGroup>
                  <FormLabel>Willingness to pay</FormLabel>
                  <FormInput type="text" value={form.willingness} onChange={(e) => setForm({ ...form, willingness: e.target.value })} placeholder="e.g. $20/month" />
                </FormGroup>
                <FormGroup>
                  <FormLabel>Platform / channel</FormLabel>
                  <FormInput type="text" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} placeholder="e.g. Twitter, Reddit r/startups" />
                </FormGroup>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <Button variant="primary" type="submit">Save</Button>
                <Button variant="ghost" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </section>
        )}

        {loading ? (
          <p style={{ textAlign: "center", color: "var(--text-3)", padding: "2rem 0" }}>Loading...</p>
        ) : personas.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--text-3)", padding: "2rem 0" }}>No personas defined yet.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "12px" }}>
            {personas.map((p) => {
              const data = parseBody(p.body) || {};
              return (
                <article
                  key={p.id}
                  style={{
                    background: "var(--bg-2)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-lg)",
                    padding: "1.25rem 1.5rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px", marginBottom: "10px" }}>
                    <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)", margin: 0 }}>{p.title}</h3>
                    {canEdit && <Button variant="danger" onClick={() => deletePersona(p.id)}>Delete</Button>}
                  </div>
                  {data.who && (
                    <div style={{ marginBottom: "10px" }}>
                      <span style={{ fontSize: "11px", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>Who</span>
                      <p style={{ fontSize: "12.5px", color: "var(--text-2)", margin: "4px 0 0", lineHeight: 1.5 }}>{data.who}</p>
                    </div>
                  )}
                  {data.pain && (
                    <div style={{ marginBottom: "10px" }}>
                      <span style={{ fontSize: "11px", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>Pain</span>
                      <p style={{ fontSize: "12.5px", color: "var(--text-2)", margin: "4px 0 0", lineHeight: 1.5 }}>{data.pain}</p>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: "12px", marginTop: "10px", fontSize: "11px", color: "var(--text-3)", flexWrap: "wrap" }}>
                    {data.willingness && <span>Willingness: <span style={{ color: "var(--text-2)" }}>{data.willingness}</span></span>}
                    {data.platform && <span>Platform: <span style={{ color: "var(--text-2)" }}>{data.platform}</span></span>}
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
