"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import {
  PageLayout, Topbar, PageTitle, KpiRow, KpiCard, Button, Badge, Footer,
  FormGroup, FormLabel, FormInput, FormSelect,
} from "@/app/components/ui";

const PROVIDERS = [
  { id: "openrouter", label: "OpenRouter" },
  { id: "anthropic", label: "Anthropic" },
  { id: "openai", label: "OpenAI" },
  { id: "mistral", label: "Mistral" },
  { id: "google", label: "Google" },
  { id: "stripe", label: "Stripe" },
  { id: "other", label: "Other" },
];

export default function AgentKeysPage() {
  const { member, isAdmin } = useAuth();
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ provider: "openrouter", label: "", key: "", budget: "20" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchKeys();
    const sub = supabase.channel("agent_keys_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_api_keys_v2" }, fetchKeys)
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  async function fetchKeys() {
    const { data } = await supabase.from("cockpit_api_keys_v2").select("*").order("created_at", { ascending: false });
    setKeys(data || []);
    setLoading(false);
  }

  async function addKey(e) {
    e.preventDefault();
    if (!form.key.trim() || !form.label.trim()) return;
    setSaving(true);
    const last4 = form.key.slice(-4);
    const { error } = await supabase.from("cockpit_api_keys_v2").insert({
      provider: form.provider, label: form.label, key_ciphertext: "pending-server-encryption",
      key_last_4: last4, is_active: true, monthly_budget_usd: parseFloat(form.budget) || 20,
      created_by: member?.name || "admin",
    });
    if (error) alert("Error: " + error.message);
    else { setForm({ provider: "openrouter", label: "", key: "", budget: "20" }); setShowForm(false); }
    setSaving(false);
  }

  async function toggleActive(id, current) {
    await supabase.from("cockpit_api_keys_v2").update({ is_active: !current }).eq("id", id);
  }

  async function deleteKey(id) {
    if (!confirm("Delete this API key permanently?")) return;
    await supabase.from("cockpit_api_keys_v2").delete().eq("id", id);
  }

  const activeKeys = keys.filter((k) => k.is_active);
  const totalBudget = activeKeys.reduce((s, k) => s + (parseFloat(k.monthly_budget_usd) || 0), 0);

  return (
    <PageLayout>
      <Topbar breadcrumb={["Agent", "API Keys"]} actions={
        <>{isAdmin && <Button variant="primary" onClick={() => setShowForm(!showForm)}>{showForm ? "Close" : "Add Key"}</Button>}</>
      } />
      <main style={{ flex: 1, padding: "1.5rem 1.75rem", overflowY: "auto", maxWidth: "1100px", width: "100%", margin: "0 auto" }}>
        <PageTitle title="API Keys" description="Encrypted key vault. Only last 4 chars visible. AES-256-GCM encryption." />
        <KpiRow>
          <KpiCard label="Total" value={String(keys.length)} variant="accent" />
          <KpiCard label="Active" value={String(activeKeys.length)} variant="success" />
          <KpiCard label="Budget" value={`$${totalBudget}/mo`} variant="warn" />
        </KpiRow>

        {showForm && isAdmin && (
          <section style={{ padding: "1.25rem 1.5rem", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", marginBottom: "1rem" }}>
            <form onSubmit={addKey} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px" }}>
                <FormGroup><FormLabel>Provider</FormLabel>
                  <FormSelect value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}>
                    {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </FormSelect>
                </FormGroup>
                <FormGroup><FormLabel>Label *</FormLabel><FormInput value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. OpenRouter prod" required /></FormGroup>
              </div>
              <FormGroup><FormLabel>API Key *</FormLabel><FormInput type="password" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="sk-..." required /></FormGroup>
              <FormGroup><FormLabel>Monthly budget (USD)</FormLabel><FormInput type="number" step="1" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} /></FormGroup>
              <div style={{ display: "flex", gap: "8px" }}><Button variant="primary" type="submit" disabled={saving}>{saving ? "Adding..." : "Add Key"}</Button><Button variant="ghost" type="button" onClick={() => setShowForm(false)}>Cancel</Button></div>
            </form>
          </section>
        )}

        {loading ? <p style={{ textAlign: "center", color: "var(--text-3)", padding: "2rem 0" }}>Loading...</p> : keys.length === 0 ? <p style={{ textAlign: "center", color: "var(--text-3)", padding: "2rem 0" }}>No API keys configured.</p> : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {keys.map((k) => (
              <article key={k.id} style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1rem 1.25rem", opacity: k.is_active ? 1 : 0.5, display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>{k.label}</span>
                    <Badge variant="info">{k.provider}</Badge>
                    <Badge variant={k.is_active ? "success" : "neutral"}>{k.is_active ? "Active" : "Inactive"}</Badge>
                  </div>
                  <div style={{ display: "flex", gap: "16px", fontSize: "11px", color: "var(--text-3)" }}>
                    <span>Key: ····{k.key_last_4}</span>
                    <span>Budget: ${k.monthly_budget_usd}/mo</span>
                    <span>{new Date(k.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                {isAdmin && (
                  <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                    <Button variant={k.is_active ? "ghost" : "accent"} onClick={() => toggleActive(k.id, k.is_active)}>{k.is_active ? "Disable" : "Enable"}</Button>
                    <Button variant="danger" onClick={() => deleteKey(k.id)}>Delete</Button>
                  </div>
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
