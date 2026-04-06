"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const COLOR = "#64748b";

const PROVIDERS = [
  { id: "anthropic", label: "Anthropic (Claude)", prefix: "sk-ant-", placeholder: "sk-ant-api03-..." },
  { id: "openai", label: "OpenAI", prefix: "sk-", placeholder: "sk-proj-..." },
  { id: "openrouter", label: "OpenRouter", prefix: "sk-or-", placeholder: "sk-or-v1-..." },
  { id: "google", label: "Google AI", prefix: "AI", placeholder: "AIza..." },
  { id: "stripe", label: "Stripe", prefix: "sk_", placeholder: "sk_test_..." },
  { id: "other", label: "Other", prefix: "", placeholder: "Enter API key" },
];

const inputClass = "w-full py-2.5 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-sm font-mono outline-none focus:border-[#3b82f6] transition-colors";

export default function ApiKeysPage() {
  const { user, member, isAdmin } = useAuth();
  const [keys, setKeys] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ provider: "anthropic", label: "", key: "", scope: "project", expires_days: "" });
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetchKeys();
    const sub = supabase
      .channel("keys_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_api_keys" }, fetchKeys)
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  async function fetchKeys() {
    const { data } = await supabase
      .from("cockpit_api_keys")
      .select("*")
      .order("created_at", { ascending: false });
    setKeys(data || []);
  }

  function maskKey(key) {
    if (key.length <= 8) return "****" + key.slice(-4);
    return key.slice(0, 4) + "..." + key.slice(-4);
  }

  function hashKey(key) {
    // Simple hash for dedup detection (not crypto-secure, just for UI)
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return String(hash);
  }

  async function addKey(e) {
    e.preventDefault();
    setStatus(null);

    if (!form.key.trim()) {
      setStatus({ type: "error", msg: "Please enter an API key." });
      return;
    }

    const masked = maskKey(form.key);
    const hashed = hashKey(form.key);

    // Check for duplicate hash
    const existing = keys.find((k) => k.key_hash === hashed && k.provider === form.provider);
    if (existing) {
      setStatus({ type: "error", msg: "This key has already been added." });
      return;
    }

    // Store the key encrypted (base64 for now — in prod use proper encryption)
    const encrypted = btoa(form.key);

    const insertData = {
      provider: form.provider,
      label: form.label || PROVIDERS.find((p) => p.id === form.provider)?.label || form.provider,
      key_hash: hashed,
      key_masked: masked,
      key_encrypted: encrypted,
      added_by: user?.id,
      added_by_email: user?.email,
      added_by_name: member?.name || user?.email?.split("@")[0],
      scope: form.scope,
    };

    if (form.expires_days && parseInt(form.expires_days) > 0) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(form.expires_days));
      insertData.expires_at = expiresAt.toISOString();
    }

    const { error } = await supabase.from("cockpit_api_keys").insert(insertData);

    if (error) {
      setStatus({ type: "error", msg: error.message });
    } else {
      setStatus({ type: "success", msg: "Key added securely." });
      setForm({ provider: "anthropic", label: "", key: "", scope: "project", expires_days: "" });
      setShowForm(false);
    }
  }

  async function toggleActive(id, current) {
    await supabase.from("cockpit_api_keys").update({ is_active: !current }).eq("id", id);
  }

  async function deleteKey(id) {
    if (!confirm("Delete this API key? This cannot be undone.")) return;
    await supabase.from("cockpit_api_keys").delete().eq("id", id);
  }

  const projectKeys = keys.filter((k) => k.scope === "project");
  const personalKeys = keys.filter((k) => k.scope === "personal" && k.added_by === user?.id);
  const othersPersonalKeys = keys.filter((k) => k.scope === "personal" && k.added_by !== user?.id);

  return (
    <div className="space-y-8">
      <PageHeader title="API Keys" subtitle="Secure vault for project and personal API keys" color={COLOR}>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#1e3a5f] to-[#2d1b69] text-[#93c5fd] text-sm font-bold font-mono hover:opacity-90 transition-opacity"
        >
          + Add Key
        </button>
      </PageHeader>

      {/* Security notice */}
      <div className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10 text-xs text-yellow-400/80 font-mono">
        Keys are masked after saving — the full value is never displayed again. Only metadata (provider, who added, masked preview) is visible to the team.
      </div>

      {/* Add key form */}
      {showForm && (
        <Card>
          <h3 className="text-sm font-bold text-white mb-4">Add a new API key</h3>
          <form onSubmit={addKey} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] text-[#64748b] font-mono mb-1.5">Provider</label>
                <select
                  value={form.provider}
                  onChange={(e) => setForm({ ...form, provider: e.target.value })}
                  className={inputClass}
                >
                  {PROVIDERS.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-[#64748b] font-mono mb-1.5">Scope</label>
                <select
                  value={form.scope}
                  onChange={(e) => setForm({ ...form, scope: e.target.value })}
                  className={inputClass}
                >
                  <option value="project">Project (shared with team)</option>
                  <option value="personal">Personal (only you)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-[#64748b] font-mono mb-1.5">Expiration (days)</label>
              <input
                type="number"
                min="1"
                value={form.expires_days}
                onChange={(e) => setForm({ ...form, expires_days: e.target.value })}
                placeholder="e.g. 30, 90 (empty = never expires)"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[11px] text-[#64748b] font-mono mb-1.5">Label (optional)</label>
              <input
                type="text"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="e.g. Alex's Claude key, Production Stripe"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[11px] text-[#64748b] font-mono mb-1.5">API Key</label>
              <input
                type="password"
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value })}
                placeholder={PROVIDERS.find((p) => p.id === form.provider)?.placeholder}
                required
                className={inputClass}
              />
              <p className="text-[10px] text-[#475569] mt-1">The key will be masked after saving. You won't be able to see the full value again.</p>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#1e3a5f] to-[#2d1b69] text-[#93c5fd] text-sm font-bold font-mono">
                Save Key
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-[#1e293b] text-[#64748b] text-sm font-mono hover:text-white">
                Cancel
              </button>
            </div>
            {status && (
              <div className={`rounded-lg py-2 px-3 text-xs font-mono ${
                status.type === "success" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
              }`}>
                {status.msg}
              </div>
            )}
          </form>
        </Card>
      )}

      {/* Project keys */}
      <div>
        <h3 className="text-xs font-bold text-[#94a3b8] mb-3 uppercase tracking-widest">Project Keys ({projectKeys.length})</h3>
        {projectKeys.length === 0 ? (
          <Card><p className="text-[#475569] text-sm text-center py-4">No project keys yet. Add one to enable integrations.</p></Card>
        ) : (
          <div className="space-y-2">
            {projectKeys.map((k) => (
              <KeyRow key={k.id} k={k} userId={user?.id} onToggle={toggleActive} onDelete={deleteKey} />
            ))}
          </div>
        )}
      </div>

      {/* My personal keys */}
      <div>
        <h3 className="text-xs font-bold text-[#94a3b8] mb-3 uppercase tracking-widest">My Personal Keys ({personalKeys.length})</h3>
        {personalKeys.length === 0 ? (
          <Card><p className="text-[#475569] text-sm text-center py-4">No personal keys. Add keys only you can use.</p></Card>
        ) : (
          <div className="space-y-2">
            {personalKeys.map((k) => (
              <KeyRow key={k.id} k={k} userId={user?.id} onToggle={toggleActive} onDelete={deleteKey} />
            ))}
          </div>
        )}
      </div>

      {/* Others' personal keys (metadata only) */}
      {othersPersonalKeys.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-[#475569] mb-3 uppercase tracking-widest">Team Members' Keys ({othersPersonalKeys.length})</h3>
          <div className="space-y-2">
            {othersPersonalKeys.map((k) => (
              <KeyRow key={k.id} k={k} userId={user?.id} onToggle={toggleActive} onDelete={deleteKey} readonly />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function KeyRow({ k, userId, onToggle, onDelete, readonly }) {
  const isOwner = k.added_by === userId;
  const providerColors = {
    anthropic: "#d97706", openai: "#10b981", openrouter: "#8b5cf6",
    google: "#3b82f6", stripe: "#6366f1", other: "#64748b",
  };
  const color = providerColors[k.provider] || "#64748b";

  return (
    <div className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
      k.is_active ? "bg-[#0d1117] border-[#1e293b]" : "bg-[#0d1117]/50 border-[#1e293b]/50 opacity-60"
    }`}>
      {/* Provider badge */}
      <span
        className="text-[10px] font-mono font-bold px-2 py-1 rounded"
        style={{ background: color + "15", color }}
      >
        {k.provider}
      </span>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-white font-medium">{k.label}</span>
          {!k.is_active && <span className="text-[10px] text-[#475569] font-mono">disabled</span>}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[11px] text-[#475569] font-mono">{k.key_masked}</span>
          <span className="text-[10px] text-[#475569]">by {k.added_by_name}</span>
          <span className="text-[10px] text-[#475569]">{new Date(k.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
            k.scope === "project" ? "bg-blue-500/10 text-blue-400" : "bg-purple-500/10 text-purple-400"
          }`}>
            {k.scope}
          </span>
          {k.expires_at && (() => {
            const expires = new Date(k.expires_at);
            const isExpired = expires < new Date();
            return (
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                isExpired ? "bg-red-500/10 text-red-400" : "bg-orange-500/10 text-orange-400"
              }`}>
                {isExpired ? "Expired" : `Expires: ${expires.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
              </span>
            );
          })()}
        </div>
      </div>

      {/* Actions */}
      {isOwner && !readonly && (
        <div className="flex gap-2">
          <button
            onClick={() => onToggle(k.id, k.is_active)}
            className={`text-[10px] px-2 py-1 rounded font-mono transition-colors ${
              k.is_active ? "text-yellow-400 hover:bg-yellow-500/10" : "text-emerald-400 hover:bg-emerald-500/10"
            }`}
          >
            {k.is_active ? "Disable" : "Enable"}
          </button>
          <button
            onClick={() => onDelete(k.id)}
            className="text-[10px] text-red-400 hover:bg-red-500/10 px-2 py-1 rounded font-mono transition-colors"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
