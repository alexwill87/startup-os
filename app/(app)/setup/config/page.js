"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const COLOR = "#64748b";
const inputClass = "w-full py-2.5 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-sm font-mono outline-none focus:border-[#3b82f6] transition-colors";

export default function ConfigPage() {
  const { user, isAdmin } = useAuth();
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [memberCount, setMemberCount] = useState(0);
  const [dbStatus, setDbStatus] = useState("checking");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deploymentUrl, setDeploymentUrl] = useState("");

  // Telegram
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [telegramStatus, setTelegramStatus] = useState(null);

  useEffect(() => {
    setDeploymentUrl(window.location.origin);
    loadConfig();
  }, []);

  async function loadConfig() {
    const { error: pingError } = await supabase.from("cockpit_members").select("id", { head: true });
    setDbStatus(pingError ? "error" : "connected");

    const { data: nameRow } = await supabase.from("cockpit_vision").select("body").eq("topic", "other").eq("title", "config:project_name").maybeSingle();
    if (nameRow?.body) setProjectName(nameRow.body);

    const { data: descRow } = await supabase.from("cockpit_vision").select("body").eq("topic", "other").eq("title", "config:description").maybeSingle();
    if (descRow?.body) setDescription(descRow.body);

    const { count } = await supabase.from("cockpit_members").select("*", { count: "exact", head: true });
    setMemberCount(count || 0);

    // Load Telegram config
    const { data: tokenRow } = await supabase.from("cockpit_config").select("value").eq("key", "telegram_bot_token").maybeSingle();
    if (tokenRow?.value) setBotToken(tokenRow.value);

    const { data: chatRow } = await supabase.from("cockpit_config").select("value").eq("key", "telegram_chat_id").maybeSingle();
    if (chatRow?.value) setChatId(chatRow.value);
  }

  async function handleSaveProject() {
    setSaving(true);
    setSaved(false);

    for (const [key, value] of [["config:project_name", projectName], ["config:description", description]]) {
      const { data: existing } = await supabase.from("cockpit_vision").select("id").eq("topic", "other").eq("title", key).maybeSingle();
      if (existing) {
        await supabase.from("cockpit_vision").update({ body: value }).eq("id", existing.id);
      } else {
        await supabase.from("cockpit_vision").insert({ topic: "other", title: key, body: value, created_by: user?.id });
      }
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function handleSaveTelegram() {
    setTelegramStatus(null);

    // Upsert bot token
    const { data: existingToken } = await supabase.from("cockpit_config").select("key").eq("key", "telegram_bot_token").maybeSingle();
    if (existingToken) {
      await supabase.from("cockpit_config").update({ value: botToken, updated_at: new Date().toISOString() }).eq("key", "telegram_bot_token");
    } else {
      await supabase.from("cockpit_config").insert({ key: "telegram_bot_token", value: botToken });
    }

    // Upsert chat ID
    const { data: existingChat } = await supabase.from("cockpit_config").select("key").eq("key", "telegram_chat_id").maybeSingle();
    if (existingChat) {
      await supabase.from("cockpit_config").update({ value: chatId, updated_at: new Date().toISOString() }).eq("key", "telegram_chat_id");
    } else {
      await supabase.from("cockpit_config").insert({ key: "telegram_chat_id", value: chatId });
    }

    setTelegramStatus({ type: "success", msg: "Telegram config saved!" });
  }

  async function testTelegram() {
    setTelegramStatus(null);
    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: "🟢 *Project OS* is connected! Notifications will appear here.",
          parse_mode: "Markdown",
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setTelegramStatus({ type: "success", msg: "Test message sent! Check your Telegram." });
      } else {
        setTelegramStatus({ type: "error", msg: `Telegram error: ${data.description}` });
      }
    } catch (e) {
      setTelegramStatus({ type: "error", msg: e.message });
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "Not configured";

  return (
    <div className="space-y-8">
      <PageHeader title="Settings" subtitle="Project and integration configuration" color={COLOR} />

      {/* Project settings */}
      <Card>
        <h3 className="text-sm font-bold text-white mb-4">Project</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] text-[#64748b] font-mono mb-1.5">Project Name</label>
            <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="My Project" className={inputClass} />
          </div>
          <div>
            <label className="block text-[11px] text-[#64748b] font-mono mb-1.5">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this project about?" rows={3} className={inputClass + " resize-none"} />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleSaveProject} disabled={saving} className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#1e3a5f] to-[#2d1b69] text-[#93c5fd] text-sm font-bold font-mono disabled:opacity-50">
              {saving ? "Saving..." : "Save"}
            </button>
            {saved && <span className="text-emerald-400 text-xs font-mono">Saved!</span>}
          </div>
        </div>
      </Card>

      {/* Environment */}
      <Card>
        <h3 className="text-sm font-bold text-white mb-4">Environment</h3>
        <div className="space-y-3">
          {[
            ["Supabase URL", supabaseUrl],
            ["Deployment URL", deploymentUrl],
            ["Database", dbStatus === "connected" ? "Connected" : dbStatus === "error" ? "Error" : "Checking..."],
            ["Members", memberCount],
            ["Tables", "10"],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-[#1e293b] last:border-0">
              <span className="text-xs text-[#64748b]">{label}</span>
              <span className={`text-xs font-mono ${
                value === "Connected" ? "text-emerald-400" : value === "Error" ? "text-red-400" : "text-[#94a3b8]"
              }`}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Telegram Bot */}
      <Card>
        <h3 className="text-sm font-bold text-white mb-2">Telegram Bot</h3>
        <p className="text-[11px] text-[#475569] mb-4">
          Get notifications in Telegram when things happen in your project.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] text-[#64748b] font-mono mb-1.5">Bot Token</label>
            <input
              type="password"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
              className={inputClass}
            />
            <p className="text-[10px] text-[#475569] mt-1">From @BotFather on Telegram</p>
          </div>
          <div>
            <label className="block text-[11px] text-[#64748b] font-mono mb-1.5">Chat ID</label>
            <input
              type="text"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder="-1001234567890"
              className={inputClass}
            />
            <p className="text-[10px] text-[#475569] mt-1">Group chat ID. Add the bot to your group, then use @userinfobot to get the chat ID.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleSaveTelegram} className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#1e3a5f] to-[#2d1b69] text-[#93c5fd] text-sm font-bold font-mono">
              Save
            </button>
            {botToken && chatId && (
              <button onClick={testTelegram} className="px-4 py-2 rounded-lg border border-[#1e293b] text-[#94a3b8] text-sm font-mono hover:text-white hover:border-[#334155] transition-colors">
                Test
              </button>
            )}
          </div>
          {telegramStatus && (
            <div className={`rounded-lg py-2 px-3 text-xs font-mono ${
              telegramStatus.type === "success" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
            }`}>
              {telegramStatus.msg}
            </div>
          )}
        </div>

        {/* Setup instructions */}
        <div className="mt-6 p-4 rounded-lg bg-[#0a0f1a] border border-[#1e293b]">
          <h4 className="text-xs font-bold text-white mb-2">How to set up</h4>
          <ol className="text-[11px] text-[#94a3b8] space-y-1.5 list-decimal list-inside">
            <li>Open Telegram, search <span className="text-blue-400">@BotFather</span></li>
            <li>Send <span className="font-mono text-white">/newbot</span>, choose a name and username</li>
            <li>Copy the token and paste it above</li>
            <li>Create a group chat and add your bot to it</li>
            <li>Send a message in the group, then visit:<br/>
              <span className="font-mono text-[#475569]">https://api.telegram.org/bot{'<TOKEN>'}/getUpdates</span><br/>
              Find the chat ID in the response (negative number for groups)
            </li>
            <li>Paste the chat ID above and click Test</li>
          </ol>
        </div>
      </Card>
    </div>
  );
}
