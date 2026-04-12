"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import {
  PageLayout, Topbar, PageTitle, KpiRow, KpiCard, Button, Badge, Footer,
  FormGroup, FormLabel, FormInput,
} from "@/app/components/ui";

export default function BotSettingsPage() {
  const { isAdmin } = useAuth();
  const [config, setConfig] = useState({ telegram_bot_token: "", telegram_chat_id: "", bot_provider: "openrouter", bot_model: "anthropic/claude-3-haiku" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => { fetchConfig(); }, []);

  async function fetchConfig() {
    const { data } = await supabase.from("cockpit_config").select("key, value");
    const m = {};
    (data || []).forEach((r) => (m[r.key] = r.value));
    setConfig({
      telegram_bot_token: m.telegram_bot_token || "",
      telegram_chat_id: m.telegram_chat_id || "",
      bot_provider: m.bot_provider || "openrouter",
      bot_model: m.bot_model || "anthropic/claude-3-haiku",
    });
    setLoading(false);
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true); setMsg(null);
    for (const [key, value] of Object.entries(config)) {
      const { data: existing } = await supabase.from("cockpit_config").select("key").eq("key", key).maybeSingle();
      if (existing) await supabase.from("cockpit_config").update({ value }).eq("key", key);
      else await supabase.from("cockpit_config").insert({ key, value });
    }
    setSaving(false);
    setMsg({ type: "success", text: "Bot configuration saved." });
  }

  async function testBot() {
    if (!config.telegram_chat_id) { alert("Set a chat ID first"); return; }
    try {
      const res = await fetch("/api/telegram", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: { chat: { id: parseInt(config.telegram_chat_id) }, text: "/start", from: { id: 0, first_name: "Test" } } }) });
      alert(res.ok ? "Test message sent" : "Test failed");
    } catch { alert("Test failed — check console"); }
  }

  return (
    <PageLayout>
      <Topbar breadcrumb={["Settings", "Bot"]} />
      <main style={{ flex: 1, padding: "1.5rem 1.75rem", overflowY: "auto", maxWidth: "900px", width: "100%", margin: "0 auto" }}>
        <PageTitle title="Telegram Bot" description="Configure the Telegram bot for notifications, task creation, and AI responses." />

        <KpiRow>
          <KpiCard label="Token" value={config.telegram_bot_token ? "Set" : "Missing"} variant={config.telegram_bot_token ? "success" : "warn"} />
          <KpiCard label="Chat ID" value={config.telegram_chat_id || "—"} variant={config.telegram_chat_id ? "success" : "muted"} />
          <KpiCard label="Provider" value={config.bot_provider} variant="accent" />
          <KpiCard label="Model" value={config.bot_model.split("/").pop()} variant="default" />
        </KpiRow>

        {loading ? <p style={{ textAlign: "center", color: "var(--text-3)", padding: "2rem 0" }}>Loading...</p> : (
          <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <section style={cs}>
              <h3 style={st}>Telegram</h3>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>
                <FormGroup><FormLabel>Bot Token</FormLabel><FormInput type="password" value={config.telegram_bot_token} onChange={(e) => setConfig({ ...config, telegram_bot_token: e.target.value })} placeholder="123456:ABC-DEF..." /></FormGroup>
                <FormGroup><FormLabel>Admin Chat ID</FormLabel><FormInput value={config.telegram_chat_id} onChange={(e) => setConfig({ ...config, telegram_chat_id: e.target.value })} placeholder="123456789" /></FormGroup>
              </div>
            </section>

            <section style={cs}>
              <h3 style={st}>AI Model</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px" }}>
                <FormGroup><FormLabel>Provider</FormLabel><FormInput value={config.bot_provider} onChange={(e) => setConfig({ ...config, bot_provider: e.target.value })} placeholder="openrouter" /></FormGroup>
                <FormGroup><FormLabel>Model</FormLabel><FormInput value={config.bot_model} onChange={(e) => setConfig({ ...config, bot_model: e.target.value })} placeholder="anthropic/claude-3-haiku" /></FormGroup>
              </div>
            </section>

            {msg && <div style={{ padding: "10px 14px", borderRadius: "var(--radius)", fontSize: "12.5px", background: "var(--success-bg)", color: "var(--success-text)", border: "1px solid var(--success)" }}>{msg.text}</div>}

            <div style={{ display: "flex", gap: "8px" }}>
              <Button variant="primary" type="submit" disabled={saving || !isAdmin}>{saving ? "Saving..." : "Save"}</Button>
              <Button variant="secondary" type="button" onClick={testBot}>Test bot</Button>
            </div>
          </form>
        )}
      </main>
      <Footer />
    </PageLayout>
  );
}

const cs = { background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.25rem 1.5rem" };
const st = { fontSize: "14px", fontWeight: 600, color: "var(--text)", margin: "0 0 12px" };
