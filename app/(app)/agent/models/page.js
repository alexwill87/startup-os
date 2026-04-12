"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import {
  PageLayout, Topbar, PageTitle, KpiRow, KpiCard, Button, Badge, Footer,
  FormGroup, FormLabel, FormInput, FormSelect,
} from "@/app/components/ui";

const ROLES = [
  { id: "chat", label: "Chat", description: "Responds to users in chat and Telegram" },
  { id: "embedding", label: "Embedding", description: "Generates vectors for semantic memory" },
  { id: "extraction", label: "Extraction", description: "Extracts memories from conversation turns" },
  { id: "summary", label: "Summary", description: "Generates daily summaries and recaps" },
];

export default function AgentModelsPage() {
  const { isAdmin } = useAuth();
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ provider: "", model_id: "", input_cost: "", output_cost: "" });

  useEffect(() => {
    fetchModels();
    const sub = supabase.channel("agent_models_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_agent_models" }, fetchModels)
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  async function fetchModels() {
    const { data } = await supabase.from("cockpit_agent_models").select("*").order("role");
    setModels(data || []);
    setLoading(false);
  }

  async function updateModel(id, updates) {
    await supabase.from("cockpit_agent_models").update(updates).eq("id", id);
  }

  async function toggleEnabled(id, current) {
    await supabase.from("cockpit_agent_models").update({ enabled: !current }).eq("id", id);
  }

  async function setDefault(id, role) {
    // Remove default from other models of same role
    const sameRole = models.filter((m) => m.role === role && m.id !== id);
    for (const m of sameRole) {
      await supabase.from("cockpit_agent_models").update({ is_default: false }).eq("id", m.id);
    }
    await supabase.from("cockpit_agent_models").update({ is_default: true }).eq("id", id);
  }

  async function saveEdit(id) {
    await updateModel(id, {
      provider: form.provider,
      model_id: form.model_id,
      input_cost_per_1m_usd: parseFloat(form.input_cost) || 0,
      output_cost_per_1m_usd: parseFloat(form.output_cost) || 0,
    });
    setEditing(null);
  }

  function startEdit(m) {
    setEditing(m.id);
    setForm({
      provider: m.provider, model_id: m.model_id,
      input_cost: String(m.input_cost_per_1m_usd || 0),
      output_cost: String(m.output_cost_per_1m_usd || 0),
    });
  }

  const enabledCount = models.filter((m) => m.enabled).length;
  const defaultCount = models.filter((m) => m.is_default).length;

  return (
    <PageLayout>
      <Topbar breadcrumb={["Agent", "Models"]} />
      <main style={{ flex: 1, padding: "1.5rem 1.75rem", overflowY: "auto", maxWidth: "1100px", width: "100%", margin: "0 auto" }}>
        <PageTitle title="Models" description="Choose the LLM model for each role. Each role has one default model." />

        <KpiRow>
          <KpiCard label="Roles" value={String(ROLES.length)} variant="accent" />
          <KpiCard label="Models" value={String(models.length)} variant="default" />
          <KpiCard label="Enabled" value={String(enabledCount)} variant="success" />
          <KpiCard label="Defaults set" value={`${defaultCount}/${ROLES.length}`} variant={defaultCount === ROLES.length ? "success" : "warn"} />
        </KpiRow>

        {loading ? <p style={{ textAlign: "center", color: "var(--text-3)", padding: "2rem 0" }}>Loading...</p> : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {ROLES.map((role) => {
              const roleModels = models.filter((m) => m.role === role.id);
              const defaultModel = roleModels.find((m) => m.is_default);
              return (
                <section key={role.id}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                    <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)", margin: 0 }}>{role.label}</h3>
                    <span style={{ fontSize: "11px", color: "var(--text-3)" }}>{role.description}</span>
                    {defaultModel && <Badge variant="success">Default: {defaultModel.model_id}</Badge>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {roleModels.length === 0 && <p style={{ fontSize: "12px", color: "var(--text-3)" }}>No model configured for this role.</p>}
                    {roleModels.map((m) => (
                      <article
                        key={m.id}
                        style={{
                          background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)",
                          padding: "1rem 1.25rem", opacity: m.enabled ? 1 : 0.5,
                          borderLeft: m.is_default ? "3px solid var(--success)" : "3px solid transparent",
                        }}
                      >
                        {editing === m.id ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "10px" }}>
                              <FormGroup><FormLabel>Provider</FormLabel><FormInput value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} /></FormGroup>
                              <FormGroup><FormLabel>Model ID</FormLabel><FormInput value={form.model_id} onChange={(e) => setForm({ ...form, model_id: e.target.value })} placeholder="anthropic/claude-3-haiku" /></FormGroup>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                              <FormGroup><FormLabel>Input cost ($/1M tokens)</FormLabel><FormInput type="number" step="0.01" value={form.input_cost} onChange={(e) => setForm({ ...form, input_cost: e.target.value })} /></FormGroup>
                              <FormGroup><FormLabel>Output cost ($/1M tokens)</FormLabel><FormInput type="number" step="0.01" value={form.output_cost} onChange={(e) => setForm({ ...form, output_cost: e.target.value })} /></FormGroup>
                            </div>
                            <div style={{ display: "flex", gap: "6px" }}>
                              <Button variant="primary" onClick={() => saveEdit(m.id)}>Save</Button>
                              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>{m.model_id}</span>
                                <Badge variant="info">{m.provider}</Badge>
                                {m.is_default && <Badge variant="success">Default</Badge>}
                                {!m.enabled && <Badge variant="neutral">Disabled</Badge>}
                              </div>
                              <div style={{ display: "flex", gap: "16px", fontSize: "11px", color: "var(--text-3)" }}>
                                <span>Input: ${m.input_cost_per_1m_usd}/1M</span>
                                <span>Output: ${m.output_cost_per_1m_usd}/1M</span>
                              </div>
                            </div>
                            {isAdmin && (
                              <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                                {!m.is_default && m.enabled && <Button variant="secondary" onClick={() => setDefault(m.id, m.role)}>Set default</Button>}
                                <Button variant={m.enabled ? "ghost" : "accent"} onClick={() => toggleEnabled(m.id, m.enabled)}>{m.enabled ? "Disable" : "Enable"}</Button>
                                <Button variant="ghost" onClick={() => startEdit(m)}>Edit</Button>
                              </div>
                            )}
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </PageLayout>
  );
}
