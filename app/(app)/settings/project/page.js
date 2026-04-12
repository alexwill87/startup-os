"use client";

/**
 * Settings/Project — Cockpit personalization
 * Reads/writes: cockpit_vision (topic='other', title='config:*') + cockpit_config
 * This is the ONLY page where the project identity is defined.
 */

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth, useProject } from "@/lib/AuthProvider";
import {
  PageLayout, Topbar, PageTitle, KpiRow, KpiCard, Button, Badge, Footer,
  FormGroup, FormLabel, FormInput, FormTextarea,
} from "@/app/components/ui";

export default function ProjectSettingsPage() {
  const { user, isAdmin } = useAuth();
  const project = useProject();
  const [form, setForm] = useState({ name: "", description: "", logo_url: "" });
  const [configForm, setConfigForm] = useState({ feature_vote_pct: "66", control_vote_pct: "66", telegram_bot_token: "", telegram_chat_id: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    // Load project identity from cockpit_vision (config:*)
    const { data: visionRows } = await supabase
      .from("cockpit_vision")
      .select("*")
      .eq("topic", "other")
      .in("title", ["config:project_name", "config:description", "config:logo_url"]);

    const vMap = {};
    (visionRows || []).forEach((r) => (vMap[r.title] = r));

    setForm({
      name: vMap["config:project_name"]?.body || "",
      description: vMap["config:description"]?.body || "",
      logo_url: vMap["config:logo_url"]?.body || "",
    });

    // Load config keys
    const { data: configRows } = await supabase.from("cockpit_config").select("key, value");
    const cMap = {};
    (configRows || []).forEach((r) => (cMap[r.key] = r.value));

    setConfigForm({
      feature_vote_pct: cMap.feature_vote_pct || "66",
      control_vote_pct: cMap.control_vote_pct || "66",
      telegram_bot_token: cMap.telegram_bot_token || "",
      telegram_chat_id: cMap.telegram_chat_id || "",
    });

    setLoading(false);
  }

  async function saveProject(e) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    // Upsert config:* in cockpit_vision
    const configs = [
      { title: "config:project_name", body: form.name },
      { title: "config:description", body: form.description },
      { title: "config:logo_url", body: form.logo_url },
    ];

    for (const cfg of configs) {
      const { data: existing } = await supabase
        .from("cockpit_vision")
        .select("id")
        .eq("topic", "other")
        .eq("title", cfg.title)
        .maybeSingle();

      if (existing) {
        await supabase.from("cockpit_vision").update({ body: cfg.body }).eq("id", existing.id);
      } else {
        await supabase.from("cockpit_vision").insert({
          topic: "other", title: cfg.title, body: cfg.body,
          builder: user?.email || "admin", pinned: false,
        });
      }
    }

    // Upsert config keys
    const configKeys = [
      { key: "feature_vote_pct", value: configForm.feature_vote_pct },
      { key: "control_vote_pct", value: configForm.control_vote_pct },
      { key: "telegram_bot_token", value: configForm.telegram_bot_token },
      { key: "telegram_chat_id", value: configForm.telegram_chat_id },
    ];

    for (const ck of configKeys) {
      const { data: existing } = await supabase
        .from("cockpit_config")
        .select("key")
        .eq("key", ck.key)
        .maybeSingle();

      if (existing) {
        await supabase.from("cockpit_config").update({ value: ck.value }).eq("key", ck.key);
      } else {
        await supabase.from("cockpit_config").insert(ck);
      }
    }

    setSaving(false);
    setMsg({ type: "success", text: "Settings saved. Refresh the page to see changes in the sidebar." });
  }

  return (
    <PageLayout>
      <Topbar breadcrumb={["Settings", "Project"]} />
      <main style={{ flex: 1, padding: "1.5rem 1.75rem", overflowY: "auto", maxWidth: "900px", width: "100%", margin: "0 auto" }}>
        <PageTitle title="Project Settings" description="Everything that personalizes this cockpit instance. Name and logo appear everywhere." />

        <KpiRow>
          <KpiCard label="Name" value={project?.name || "—"} variant="accent" />
          <KpiCard label="Logo" value={project?.logo ? "Set" : "None"} variant={project?.logo ? "success" : "muted"} />
          <KpiCard label="Vote threshold" value={`${configForm.feature_vote_pct}%`} variant="warn" />
        </KpiRow>

        {loading ? (
          <p style={{ textAlign: "center", color: "var(--text-3)", padding: "2rem 0" }}>Loading...</p>
        ) : (
          <form onSubmit={saveProject} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Identity */}
            <section style={cardStyle}>
              <h3 style={sectionTitle}>Project Identity</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <FormGroup>
                  <FormLabel>Project name</FormLabel>
                  <FormInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="My Startup" />
                </FormGroup>
                <FormGroup>
                  <FormLabel>Description</FormLabel>
                  <FormTextarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What this project does..." />
                </FormGroup>
                <FormGroup>
                  <FormLabel>Logo URL</FormLabel>
                  <FormInput value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://..." />
                </FormGroup>
                {form.logo_url && (
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "11px", color: "var(--text-3)" }}>Preview:</span>
                    <img src={form.logo_url} alt="logo" style={{ width: 40, height: 40, borderRadius: "var(--radius)", objectFit: "contain", border: "1px solid var(--border)" }} />
                  </div>
                )}
              </div>
            </section>

            {/* Voting rules */}
            <section style={cardStyle}>
              <h3 style={sectionTitle}>Voting Rules</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <FormGroup>
                  <FormLabel>Feature vote threshold (%)</FormLabel>
                  <FormInput type="number" min="1" max="100" value={configForm.feature_vote_pct} onChange={(e) => setConfigForm({ ...configForm, feature_vote_pct: e.target.value })} />
                </FormGroup>
                <FormGroup>
                  <FormLabel>Control vote threshold (%)</FormLabel>
                  <FormInput type="number" min="1" max="100" value={configForm.control_vote_pct} onChange={(e) => setConfigForm({ ...configForm, control_vote_pct: e.target.value })} />
                </FormGroup>
              </div>
            </section>

            {/* Telegram */}
            <section style={cardStyle}>
              <h3 style={sectionTitle}>Telegram Bot</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <FormGroup>
                  <FormLabel>Bot Token</FormLabel>
                  <FormInput type="password" value={configForm.telegram_bot_token} onChange={(e) => setConfigForm({ ...configForm, telegram_bot_token: e.target.value })} placeholder="123456:ABC..." />
                </FormGroup>
                <FormGroup>
                  <FormLabel>Admin Chat ID</FormLabel>
                  <FormInput value={configForm.telegram_chat_id} onChange={(e) => setConfigForm({ ...configForm, telegram_chat_id: e.target.value })} placeholder="123456789" />
                </FormGroup>
              </div>
            </section>

            {msg && (
              <div style={{
                padding: "10px 14px", borderRadius: "var(--radius)", fontSize: "12.5px",
                background: msg.type === "success" ? "var(--success-bg)" : "var(--danger-bg)",
                color: msg.type === "success" ? "var(--success-text)" : "var(--danger-text)",
                border: `1px solid ${msg.type === "success" ? "var(--success)" : "var(--danger)"}`,
              }}>
                {msg.text}
              </div>
            )}

            <div style={{ display: "flex", gap: "8px" }}>
              <Button variant="primary" type="submit" disabled={saving || !isAdmin}>
                {saving ? "Saving..." : "Save Settings"}
              </Button>
              {!isAdmin && <span style={{ fontSize: "11px", color: "var(--text-3)", alignSelf: "center" }}>Admin only</span>}
            </div>
          </form>
        )}
      </main>
      <Footer />
    </PageLayout>
  );
}

const cardStyle = { background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.25rem 1.5rem" };
const sectionTitle = { fontSize: "14px", fontWeight: 600, color: "var(--text)", margin: "0 0 12px" };
