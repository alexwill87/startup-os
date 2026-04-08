"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const COLOR = "#64748b";
const input = "w-full py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-sm outline-none focus:border-blue-500";

export default function ConfigPage() {
  const { user, isAdmin } = useAuth();
  const [cfg, setCfg] = useState({});
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [memberCount, setMemberCount] = useState(0);
  const [dbStatus, setDbStatus] = useState("checking");
  const [deploymentUrl, setDeploymentUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Telegram
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [telegramStatus, setTelegramStatus] = useState(null);

  // Validation settings
  const [featureVotePct, setFeatureVotePct] = useState("66");
  const [controlVotePct, setControlVotePct] = useState("66");

  // API Keys
  const [apiKeys, setApiKeys] = useState([]);
  const [newKey, setNewKey] = useState({ provider: "openrouter", key: "" });

  useEffect(() => {
    setDeploymentUrl(window.location.origin);
    loadAll();
  }, []);

  async function loadAll() {
    const { error: pingError } = await supabase.from("cockpit_members").select("id", { head: true });
    setDbStatus(pingError ? "error" : "connected");

    const { data: nameRow } = await supabase.from("cockpit_vision").select("body").eq("topic", "other").eq("title", "config:project_name").maybeSingle();
    if (nameRow?.body) setProjectName(nameRow.body);

    const { data: descRow } = await supabase.from("cockpit_vision").select("body").eq("topic", "other").eq("title", "config:description").maybeSingle();
    if (descRow?.body) setDescription(descRow.body);

    const { count } = await supabase.from("cockpit_members").select("*", { count: "exact", head: true });
    setMemberCount(count || 0);

    const { data: configRows } = await supabase.from("cockpit_config").select("key, value");
    const c = {};
    (configRows || []).forEach((r) => (c[r.key] = r.value));
    setCfg(c);
    setBotToken(c.telegram_bot_token || "");
    setChatId(c.telegram_chat_id || "");
    setFeatureVotePct(c.feature_vote_pct || "66");
    setControlVotePct(c.control_vote_pct || "66");

    const { data: keys } = await supabase.from("cockpit_api_keys").select("id, provider, key_masked, is_active, created_at").order("created_at");
    setApiKeys(keys || []);
  }

  async function saveConfig(key, value) {
    const { data: existing } = await supabase.from("cockpit_config").select("key").eq("key", key).maybeSingle();
    if (existing) await supabase.from("cockpit_config").update({ value, updated_at: new Date().toISOString() }).eq("key", key);
    else await supabase.from("cockpit_config").insert({ key, value });
  }

  async function saveProject() {
    setSaving(true);
    for (const [key, value] of [["config:project_name", projectName], ["config:description", description]]) {
      const { data: existing } = await supabase.from("cockpit_vision").select("id").eq("topic", "other").eq("title", key).maybeSingle();
      if (existing) await supabase.from("cockpit_vision").update({ body: value }).eq("id", existing.id);
      else await supabase.from("cockpit_vision").insert({ topic: "other", title: key, body: value, created_by: user?.id });
    }
    await saveConfig("feature_vote_pct", featureVotePct);
    await saveConfig("control_vote_pct", controlVotePct);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  async function saveTelegram() {
    await saveConfig("telegram_bot_token", botToken);
    await saveConfig("telegram_chat_id", chatId);
    setTelegramStatus({ ok: true, msg: "Saved!" });
  }

  async function testTelegram() {
    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: "Test from Project OS", parse_mode: "Markdown" }),
      });
      const data = await res.json();
      setTelegramStatus({ ok: data.ok, msg: data.ok ? "Sent!" : data.description });
    } catch (e) { setTelegramStatus({ ok: false, msg: e.message }); }
  }

  async function addApiKey() {
    if (!newKey.key.trim()) return;
    const masked = newKey.key.slice(0, 4) + "..." + newKey.key.slice(-4);
    await supabase.from("cockpit_api_keys").insert({
      provider: newKey.provider, key_encrypted: btoa(newKey.key), key_masked: masked,
      key_hash: newKey.key.slice(-8), is_active: true, added_by: user?.id,
    });
    setNewKey({ provider: "openrouter", key: "" });
    loadAll();
  }

  async function toggleKey(id, active) {
    await supabase.from("cockpit_api_keys").update({ is_active: !active }).eq("id", id);
    loadAll();
  }

  async function deleteKey(id) {
    await supabase.from("cockpit_api_keys").delete().eq("id", id);
    loadAll();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "—";

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader title="Settings" subtitle="Project configuration" color={COLOR}>
        <div className="flex gap-2 items-center">
          {saved && <span className="text-xs text-green-400">Saved</span>}
          <button onClick={saveProject} disabled={saving} className="px-4 py-1.5 text-xs font-bold rounded-lg text-white bg-blue-500 disabled:opacity-50">
            {saving ? "..." : "Save All"}
          </button>
        </div>
      </PageHeader>

      {/* Row 1: Project + Environment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-3">Project</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] text-[#475569] mb-1">Name</label>
              <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="My Startup" className={input} />
            </div>
            <div>
              <label className="block text-[10px] text-[#475569] mb-1">Description</label>
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description" className={input} />
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-3">Environment</h3>
          <div className="space-y-2">
            {[
              ["Database", dbStatus === "connected" ? "Connected" : "Error", dbStatus === "connected"],
              ["Supabase", supabaseUrl.replace("https://", "").slice(0, 20) + "...", true],
              ["Deploy", deploymentUrl.replace("https://", ""), true],
              ["Members", memberCount, true],
            ].map(([l, v, ok]) => (
              <div key={l} className="flex justify-between text-xs">
                <span className="text-[#475569]">{l}</span>
                <span className={ok ? "text-[#94a3b8] font-mono" : "text-red-400 font-mono"}>{v}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Row 2: Validation + Telegram */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-3">Validation Rules</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] text-[#475569] mb-1">Feature approval threshold (%)</label>
              <div className="flex items-center gap-2">
                <input type="number" min="50" max="100" value={featureVotePct} onChange={(e) => setFeatureVotePct(e.target.value)} className={input + " w-20"} />
                <span className="text-xs text-[#475569]">% of active members must vote to validate a feature</span>
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-[#475569] mb-1">Post-deploy control threshold (%)</label>
              <div className="flex items-center gap-2">
                <input type="number" min="50" max="100" value={controlVotePct} onChange={(e) => setControlVotePct(e.target.value)} className={input + " w-20"} />
                <span className="text-xs text-[#475569]">% needed to confirm a feature is correctly deployed</span>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-3">Telegram Bot</h3>
          <div className="space-y-2">
            <input type="password" value={botToken} onChange={(e) => setBotToken(e.target.value)} placeholder="Bot token" className={input} />
            <input type="text" value={chatId} onChange={(e) => setChatId(e.target.value)} placeholder="Chat ID" className={input} />
            <div className="flex gap-2">
              <button onClick={saveTelegram} className="px-3 py-1.5 text-[10px] font-bold rounded-lg text-blue-400 bg-blue-500/10 border border-blue-500/20">Save</button>
              {botToken && chatId && <button onClick={testTelegram} className="px-3 py-1.5 text-[10px] font-bold rounded-lg text-[#64748b] border border-[#1e293b]">Test</button>}
              {telegramStatus && <span className={`text-[10px] self-center ${telegramStatus.ok ? "text-green-400" : "text-red-400"}`}>{telegramStatus.msg}</span>}
            </div>
          </div>
        </Card>
      </div>

      {/* Row 3: API Keys */}
      <Card>
        <h3 className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-3">API Keys</h3>
        {apiKeys.length > 0 && (
          <div className="space-y-2 mb-4">
            {apiKeys.map((k) => (
              <div key={k.id} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-[#0a0f1a] border border-[#1e293b]">
                <span className="text-xs font-bold text-[#94a3b8] w-24">{k.provider}</span>
                <span className="text-xs font-mono text-[#475569] flex-1">{k.key_masked}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${k.is_active ? "text-green-400 bg-green-400/10" : "text-red-400 bg-red-400/10"}`}>
                  {k.is_active ? "active" : "off"}
                </span>
                <button onClick={() => toggleKey(k.id, k.is_active)} className="text-[10px] text-[#475569] hover:text-white">{k.is_active ? "Disable" : "Enable"}</button>
                <button onClick={() => deleteKey(k.id)} className="text-[10px] text-red-400/40 hover:text-red-400">Del</button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <select value={newKey.provider} onChange={(e) => setNewKey({ ...newKey, provider: e.target.value })}
            className="py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-xs outline-none w-32">
            {["openrouter", "anthropic", "mistral", "openai", "google", "stripe", "other"].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <input type="password" value={newKey.key} onChange={(e) => setNewKey({ ...newKey, key: e.target.value })} placeholder="Paste API key..." className={input + " flex-1"} />
          <button onClick={addApiKey} className="px-4 py-2 text-xs font-bold rounded-lg text-white bg-blue-500 shrink-0">Add</button>
        </div>
      </Card>
    </div>
  );
}
