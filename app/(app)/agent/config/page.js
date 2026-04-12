"use client";

/**
 * Agent Config — 4 tabs: Identity, Soul, Rules, Tools
 * Reads/writes cockpit_agent_docs (kind = identity|soul|rules|tools)
 * Versioned: editing creates version+1, old row set is_active=false
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import {
  PageLayout, Topbar, PageTitle, KpiRow, KpiCard, Button, Badge, Footer,
  FormGroup, FormLabel, FormInput, FormTextarea, FormSelect,
} from "@/app/components/ui";

const TABS = [
  { id: "identity", label: "Identity" },
  { id: "soul", label: "Soul" },
  { id: "rules", label: "Rules" },
  { id: "tools", label: "Tools" },
];

export default function AgentConfigPage() {
  const { member } = useAuth();
  const [docs, setDocs] = useState({});
  const [activeTab, setActiveTab] = useState("identity");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchDocs = useCallback(async () => {
    const { data } = await supabase
      .from("cockpit_agent_docs")
      .select("*")
      .eq("is_active", true)
      .order("updated_at", { ascending: false });
    const mapped = {};
    (data || []).forEach((d) => (mapped[d.kind] = d));
    setDocs(mapped);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDocs();
    const sub = supabase
      .channel("agent_config_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_agent_docs" }, fetchDocs)
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, [fetchDocs]);

  async function saveDoc(kind, newBody) {
    setSaving(true);
    const existing = docs[kind];
    if (existing) {
      await supabase.from("cockpit_agent_docs").update({ is_active: false }).eq("id", existing.id);
      await supabase.from("cockpit_agent_docs").insert({
        kind,
        version: (existing.version || 1) + 1,
        body: newBody,
        is_active: true,
        updated_by: member?.name || "admin",
      });
    } else {
      await supabase.from("cockpit_agent_docs").insert({
        kind, version: 1, body: newBody, is_active: true, updated_by: member?.name || "admin",
      });
    }
    setSaving(false);
    fetchDocs();
  }

  const currentDoc = docs[activeTab];
  const currentBody = currentDoc?.body || {};
  const currentVersion = currentDoc?.version || 0;

  const cs = { background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.25rem 1.5rem" };
  const st = { fontSize: "14px", fontWeight: 600, color: "var(--text)", margin: "0 0 12px" };

  return (
    <PageLayout>
      <Topbar breadcrumb={["Agent", "Config"]} actions={<Button variant="ghost" onClick={fetchDocs}>Refresh</Button>} />
      <main style={{ flex: 1, padding: "1.5rem 1.75rem", overflowY: "auto", maxWidth: "1100px", width: "100%", margin: "0 auto" }}>
        <PageTitle title="Agent Config" description="Configure Steve, the Startup Assistant. Changes take effect immediately." />

        <KpiRow>
          <KpiCard label="Identity" value={docs.identity ? "v" + docs.identity.version : "—"} variant={docs.identity ? "success" : "muted"} />
          <KpiCard label="Soul" value={docs.soul ? "v" + docs.soul.version : "—"} variant={docs.soul ? "success" : "muted"} />
          <KpiCard label="Rules" value={docs.rules ? String((docs.rules.body || []).length) : "—"} trend="rules" variant="accent" />
          <KpiCard label="Tools" value={docs.tools ? String((docs.tools.body || []).length) : "—"} trend="tools" variant="warn" />
        </KpiRow>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px", marginBottom: "1.5rem", borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: "8px 16px", borderRadius: "var(--radius)", border: "none",
              background: activeTab === tab.id ? "var(--bg-3)" : "transparent",
              color: activeTab === tab.id ? "var(--text)" : "var(--text-3)",
              fontWeight: activeTab === tab.id ? 600 : 400, fontSize: "13px", cursor: "pointer",
            }}>{tab.label}</button>
          ))}
        </div>

        {loading ? (
          <p style={{ textAlign: "center", color: "var(--text-3)", padding: "2rem 0" }}>Loading...</p>
        ) : (
          <div>
            {currentDoc && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1rem", fontSize: "11px", color: "var(--text-3)" }}>
                <Badge variant="neutral">v{currentVersion}</Badge>
                <span>by {currentDoc.updated_by || "unknown"} — {new Date(currentDoc.updated_at).toLocaleString()}</span>
              </div>
            )}

            {activeTab === "identity" && (
              <section style={cs}>
                <h3 style={st}>Agent Identity</h3>
                <IdentityForm body={currentBody} onSave={(b) => saveDoc("identity", b)} saving={saving} />
              </section>
            )}
            {activeTab === "soul" && (
              <section style={cs}>
                <h3 style={st}>Agent Soul</h3>
                <SoulForm body={currentBody} onSave={(b) => saveDoc("soul", b)} saving={saving} />
              </section>
            )}
            {activeTab === "rules" && (
              <section style={cs}>
                <h3 style={st}>Agent Rules</h3>
                <RulesForm body={currentBody} onSave={(b) => saveDoc("rules", b)} saving={saving} />
              </section>
            )}
            {activeTab === "tools" && (
              <section style={cs}>
                <h3 style={st}>Agent Tools</h3>
                <ToolsForm body={currentBody} onSave={(b) => saveDoc("tools", b)} saving={saving} />
              </section>
            )}
          </div>
        )}
      </main>
      <Footer />
    </PageLayout>
  );
}

function IdentityForm({ body, onSave, saving }) {
  const [f, setF] = useState({ name: body.name || "Steve", title: body.title || "Startup Assistant", avatar_url: body.avatar_url || "", default_language: body.default_language || "en", tone_label: body.tone_label || "friendly-professional" });
  useEffect(() => { setF({ name: body.name || "Steve", title: body.title || "Startup Assistant", avatar_url: body.avatar_url || "", default_language: body.default_language || "en", tone_label: body.tone_label || "friendly-professional" }); }, [body]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <FormGroup><FormLabel>Name</FormLabel><FormInput value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></FormGroup>
        <FormGroup><FormLabel>Title</FormLabel><FormInput value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></FormGroup>
        <FormGroup><FormLabel>Language</FormLabel>
          <FormSelect value={f.default_language} onChange={(e) => setF({ ...f, default_language: e.target.value })}>
            <option value="en">English</option><option value="fr">French</option><option value="auto">Auto-detect</option>
          </FormSelect>
        </FormGroup>
        <FormGroup><FormLabel>Tone</FormLabel>
          <FormSelect value={f.tone_label} onChange={(e) => setF({ ...f, tone_label: e.target.value })}>
            <option value="friendly-professional">Friendly professional</option><option value="formal">Formal</option><option value="casual">Casual</option><option value="concise">Ultra concise</option>
          </FormSelect>
        </FormGroup>
      </div>
      <FormGroup><FormLabel>Avatar URL</FormLabel><FormInput value={f.avatar_url} onChange={(e) => setF({ ...f, avatar_url: e.target.value })} placeholder="https://..." /></FormGroup>
      <Button variant="primary" onClick={() => onSave(f)} disabled={saving}>{saving ? "Saving..." : "Save Identity"}</Button>
    </div>
  );
}

function SoulForm({ body, onSave, saving }) {
  const [f, setF] = useState({ mission: body.mission || "", personality: body.personality || "", values: (body.values || []).join(", "), do_list: (body.do_list || []).join("\n"), dont_list: (body.dont_list || []).join("\n") });
  useEffect(() => { setF({ mission: body.mission || "", personality: body.personality || "", values: (body.values || []).join(", "), do_list: (body.do_list || []).join("\n"), dont_list: (body.dont_list || []).join("\n") }); }, [body]);

  function save() {
    onSave({ ...body, mission: f.mission, personality: f.personality, values: f.values.split(",").map((v) => v.trim()).filter(Boolean), do_list: f.do_list.split("\n").map((l) => l.trim()).filter(Boolean), dont_list: f.dont_list.split("\n").map((l) => l.trim()).filter(Boolean), examples: body.examples || [] });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <FormGroup><FormLabel>Mission</FormLabel><FormTextarea rows={2} value={f.mission} onChange={(e) => setF({ ...f, mission: e.target.value })} placeholder="Core purpose of the agent" /></FormGroup>
      <FormGroup><FormLabel>Personality</FormLabel><FormTextarea rows={2} value={f.personality} onChange={(e) => setF({ ...f, personality: e.target.value })} placeholder="How the agent behaves" /></FormGroup>
      <FormGroup><FormLabel>Values (comma-separated)</FormLabel><FormInput value={f.values} onChange={(e) => setF({ ...f, values: e.target.value })} placeholder="clarity, honesty, speed, respect" /></FormGroup>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <FormGroup><FormLabel>Do (one per line)</FormLabel><FormTextarea rows={5} value={f.do_list} onChange={(e) => setF({ ...f, do_list: e.target.value })} /></FormGroup>
        <FormGroup><FormLabel>Don't (one per line)</FormLabel><FormTextarea rows={5} value={f.dont_list} onChange={(e) => setF({ ...f, dont_list: e.target.value })} /></FormGroup>
      </div>
      <Button variant="primary" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Soul"}</Button>
    </div>
  );
}

function RulesForm({ body, onSave, saving }) {
  const [items, setItems] = useState(Array.isArray(body) ? body : []);
  const [nr, setNr] = useState({ rule: "", reason: "", severity: "soft" });
  useEffect(() => { setItems(Array.isArray(body) ? body : []); }, [body]);

  function add() { if (!nr.rule.trim()) return; setItems([...items, { id: `r${items.length + 1}`, ...nr }]); setNr({ rule: "", reason: "", severity: "soft" }); }
  function remove(id) { setItems(items.filter((r) => r.id !== id)); }
  function toggle(id) { setItems(items.map((r) => r.id === id ? { ...r, severity: r.severity === "hard" ? "soft" : "hard" } : r)); }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {items.length === 0 && <p style={{ fontSize: "12px", color: "var(--text-3)" }}>No rules defined.</p>}
      {items.map((r) => (
        <div key={r.id} style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "10px 14px", background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
          <button onClick={() => toggle(r.id)} style={{ flexShrink: 0, padding: "2px 8px", borderRadius: "20px", fontSize: "11px", fontWeight: 500, border: "none", cursor: "pointer", background: r.severity === "hard" ? "var(--danger-bg)" : "var(--accent-bg)", color: r.severity === "hard" ? "var(--danger)" : "var(--accent-text)" }}>{r.severity}</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: "13px", color: "var(--text)", margin: 0 }}>{r.rule}</p>
            {r.reason && <p style={{ fontSize: "11px", color: "var(--text-3)", margin: "4px 0 0" }}>{r.reason}</p>}
          </div>
          <button onClick={() => remove(r.id)} style={{ flexShrink: 0, background: "transparent", border: "none", color: "var(--text-3)", cursor: "pointer", fontSize: "12px" }}>Remove</button>
        </div>
      ))}
      <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", flexWrap: "wrap" }}>
        <FormGroup style={{ flex: 1 }}><FormLabel>Rule</FormLabel><FormInput value={nr.rule} onChange={(e) => setNr({ ...nr, rule: e.target.value })} placeholder="Rule statement..." /></FormGroup>
        <FormGroup><FormLabel>Reason</FormLabel><FormInput value={nr.reason} onChange={(e) => setNr({ ...nr, reason: e.target.value })} placeholder="Why?" /></FormGroup>
        <FormGroup><FormLabel>Severity</FormLabel><FormSelect value={nr.severity} onChange={(e) => setNr({ ...nr, severity: e.target.value })}><option value="soft">Soft</option><option value="hard">Hard</option></FormSelect></FormGroup>
        <Button variant="secondary" onClick={add}>Add</Button>
      </div>
      <Button variant="primary" onClick={() => onSave(items)} disabled={saving}>{saving ? "Saving..." : `Save Rules (${items.length})`}</Button>
    </div>
  );
}

function ToolsForm({ body, onSave, saving }) {
  const [items, setItems] = useState(Array.isArray(body) ? body : []);
  useEffect(() => { setItems(Array.isArray(body) ? body : []); }, [body]);

  function toggleEnabled(id) { setItems(items.map((t) => t.id === id ? { ...t, enabled: !t.enabled } : t)); }
  function toggleConfirm(id) { setItems(items.map((t) => t.id === id ? { ...t, requires_confirmation: !t.requires_confirmation } : t)); }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <p style={{ fontSize: "12px", color: "var(--text-3)", marginBottom: "8px" }}>Toggle tools and set confirmation requirements.</p>
      {items.map((t) => (
        <div key={t.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", background: t.enabled ? "var(--bg-3)" : "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", opacity: t.enabled ? 1 : 0.5 }}>
          <button onClick={() => toggleEnabled(t.id)} style={{ width: "36px", height: "20px", borderRadius: "10px", border: "none", cursor: "pointer", background: t.enabled ? "var(--success)" : "var(--bg-3)", position: "relative", flexShrink: 0 }}>
            <span style={{ position: "absolute", top: "2px", left: t.enabled ? "18px" : "2px", width: "16px", height: "16px", borderRadius: "50%", background: "var(--text)", transition: "left 0.15s" }} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text)" }}>{t.name}</span>
              <span style={{ fontSize: "11px", color: "var(--text-3)" }}>{t.id}</span>
            </div>
            <p style={{ fontSize: "11.5px", color: "var(--text-2)", margin: "2px 0 0" }}>{t.description}</p>
          </div>
          <button onClick={() => toggleConfirm(t.id)} style={{ padding: "3px 9px", borderRadius: "20px", fontSize: "11px", fontWeight: 500, border: "none", cursor: "pointer", background: t.requires_confirmation ? "var(--warn-bg)" : "var(--bg-3)", color: t.requires_confirmation ? "var(--warn)" : "var(--text-3)", flexShrink: 0 }}>
            {t.requires_confirmation ? "Confirm required" : "Auto-execute"}
          </button>
        </div>
      ))}
      <div style={{ marginTop: "10px" }}>
        <Button variant="primary" onClick={() => onSave(items)} disabled={saving}>{saving ? "Saving..." : `Save Tools (${items.filter((t) => t.enabled).length} enabled)`}</Button>
      </div>
    </div>
  );
}
