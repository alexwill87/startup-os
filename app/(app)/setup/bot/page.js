"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const COLOR = "#64748b";

const PROVIDERS = [
  {
    id: "openrouter",
    label: "OpenRouter",
    color: "#8b5cf6",
    description: "Access 100+ models. Pay per use. Best flexibility.",
    models: [
      { id: "anthropic/claude-3-haiku", label: "Claude 3 Haiku", cost: "$0.25/M", speed: "Fast" },
      { id: "anthropic/claude-3.5-haiku", label: "Claude 3.5 Haiku", cost: "$0.80/M", speed: "Fast" },
      { id: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4", cost: "$3/M", speed: "Medium" },
      { id: "meta-llama/llama-3.1-8b-instruct:free", label: "Llama 3.1 8B (FREE)", cost: "Free", speed: "Fast" },
      { id: "google/gemma-2-9b-it:free", label: "Gemma 2 9B (FREE)", cost: "Free", speed: "Fast" },
      { id: "mistralai/mistral-7b-instruct:free", label: "Mistral 7B (FREE)", cost: "Free", speed: "Fast" },
      { id: "qwen/qwen-2-7b-instruct:free", label: "Qwen 2 7B (FREE)", cost: "Free", speed: "Fast" },
    ],
  },
  {
    id: "anthropic",
    label: "Anthropic (Direct)",
    color: "#d97706",
    description: "Direct Claude API. Requires Anthropic API key with credits.",
    models: [
      { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", cost: "$1/M", speed: "Fast" },
      { id: "claude-sonnet-4-6-20250514", label: "Claude Sonnet 4.6", cost: "$3/M", speed: "Medium" },
    ],
  },
  {
    id: "mistral",
    label: "Mistral (Direct)",
    color: "#f97316",
    description: "Mistral API. Free experimental tier available.",
    models: [
      { id: "mistral-small-latest", label: "Mistral Small", cost: "Free tier", speed: "Fast" },
      { id: "mistral-medium-latest", label: "Mistral Medium", cost: "$2.7/M", speed: "Medium" },
      { id: "open-mistral-nemo", label: "Mistral Nemo (Free)", cost: "Free", speed: "Fast" },
    ],
  },
];

const inputClass = "w-full py-2.5 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-sm font-mono outline-none focus:border-[#3b82f6] transition-colors";

export default function BotConfigPage() {
  const { isAdmin } = useAuth();
  const [config, setConfig] = useState({});
  const [keys, setKeys] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    const { data: configData } = await supabase.from("cockpit_config").select("key, value");
    const cfg = {};
    (configData || []).forEach((r) => (cfg[r.key] = r.value));
    setConfig(cfg);

    const { data: keysData } = await supabase.from("cockpit_api_keys").select("provider, key_masked, is_active, scope");
    setKeys(keysData || []);
  }

  async function saveConfig(key, value) {
    const { data: existing } = await supabase.from("cockpit_config").select("key").eq("key", key).maybeSingle();
    if (existing) {
      await supabase.from("cockpit_config").update({ value, updated_at: new Date().toISOString() }).eq("key", key);
    } else {
      await supabase.from("cockpit_config").insert({ key, value });
    }
    setConfig((c) => ({ ...c, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    // Config is already saved on each change
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function testBot() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: {
            text: "What is the project status? Reply in 1 sentence.",
            chat: { id: parseInt(config.telegram_chat_id) || 0 },
            from: { first_name: "Test" },
          },
        }),
      });
      if (res.ok) {
        setTestResult({ type: "success", msg: "Test sent! Check your Telegram." });
      } else {
        setTestResult({ type: "error", msg: "Webhook returned an error." });
      }
    } catch (e) {
      setTestResult({ type: "error", msg: e.message });
    }
    setTesting(false);
  }

  const selectedProvider = config.bot_provider || "openrouter";
  const selectedModel = config.bot_model || "anthropic/claude-3-haiku";
  const provider = PROVIDERS.find((p) => p.id === selectedProvider) || PROVIDERS[0];
  const model = provider.models.find((m) => m.id === selectedModel) || provider.models[0];
  const hasKey = keys.some((k) => k.provider === selectedProvider && k.is_active);
  const hasTelegram = config.telegram_bot_token && config.telegram_chat_id;

  return (
    <div className="space-y-8">
      <PageHeader title="Bot Configuration" subtitle="Choose the AI model and configure behavior" color={COLOR}>
        {saved && <span className="text-emerald-400 text-xs font-mono">Saved</span>}
      </PageHeader>

      {/* Status */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="text-center">
          <div className={`text-2xl font-extrabold ${hasTelegram ? "text-emerald-400" : "text-red-400"}`}>
            {hasTelegram ? "ON" : "OFF"}
          </div>
          <div className="text-xs text-[#64748b] mt-1">Telegram</div>
        </Card>
        <Card className="text-center">
          <div className={`text-2xl font-extrabold ${hasKey ? "text-emerald-400" : "text-red-400"}`}>
            {hasKey ? "ON" : "OFF"}
          </div>
          <div className="text-xs text-[#64748b] mt-1">API Key ({selectedProvider})</div>
        </Card>
        <Card className="text-center">
          <div className="text-lg font-extrabold text-white">{model?.label || "None"}</div>
          <div className="text-xs text-[#64748b] mt-1">{model?.cost || ""}</div>
        </Card>
      </div>

      {/* Provider selection */}
      <Card>
        <h3 className="text-sm font-bold text-white mb-4">AI Provider</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PROVIDERS.map((p) => {
            const active = selectedProvider === p.id;
            const pHasKey = keys.some((k) => k.provider === p.id && k.is_active);
            return (
              <button
                key={p.id}
                onClick={() => {
                  saveConfig("bot_provider", p.id);
                  saveConfig("bot_model", p.models[0].id);
                }}
                className={`p-4 rounded-lg border text-left transition-all ${
                  active
                    ? "border-[#3b82f6] bg-[#1e3a5f]/20"
                    : "border-[#1e293b] hover:border-[#334155]"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                  <span className="text-sm font-bold text-white">{p.label}</span>
                  {pHasKey && <span className="text-[9px] text-emerald-400 font-mono ml-auto">KEY OK</span>}
                  {!pHasKey && <span className="text-[9px] text-red-400 font-mono ml-auto">NO KEY</span>}
                </div>
                <p className="text-[11px] text-[#475569]">{p.description}</p>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Model selection */}
      <Card>
        <h3 className="text-sm font-bold text-white mb-4">Model — {provider.label}</h3>
        <div className="space-y-2">
          {provider.models.map((m) => {
            const active = selectedModel === m.id;
            const isFree = m.cost === "Free" || m.cost === "Free tier";
            return (
              <button
                key={m.id}
                onClick={() => saveConfig("bot_model", m.id)}
                className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                  active
                    ? "border-[#3b82f6] bg-[#1e3a5f]/20"
                    : "border-[#1e293b] hover:border-[#334155]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${active ? "bg-[#3b82f6]" : "bg-[#1e293b]"}`} />
                  <span className="text-sm text-white">{m.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                    isFree ? "bg-emerald-500/10 text-emerald-400" : "bg-[#1e293b] text-[#94a3b8]"
                  }`}>
                    {m.cost}
                  </span>
                  <span className="text-[10px] text-[#475569] font-mono">{m.speed}</span>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Bot capabilities */}
      <Card>
        <h3 className="text-sm font-bold text-white mb-4">Bot Capabilities</h3>
        <div className="space-y-3">
          {[
            { id: "bot_can_read", label: "Read project data", desc: "Tasks, decisions, KPIs, members, activity", default: true },
            { id: "bot_can_create_tasks", label: "Create tasks", desc: "Bot can add new tasks to the board when asked", default: false },
            { id: "bot_can_log_activity", label: "Log activity", desc: "Bot logs its own actions in the activity feed", default: true },
            { id: "bot_can_summarize", label: "Daily summary", desc: "Send a daily project summary to Telegram", default: false },
          ].map((cap) => {
            const enabled = config[cap.id] === "true" || (config[cap.id] === undefined && cap.default);
            return (
              <div key={cap.id} className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm text-white">{cap.label}</span>
                  <p className="text-[11px] text-[#475569]">{cap.desc}</p>
                </div>
                <button
                  onClick={() => saveConfig(cap.id, enabled ? "false" : "true")}
                  className={`w-10 h-5 rounded-full transition-colors relative ${
                    enabled ? "bg-[#3b82f6]" : "bg-[#1e293b]"
                  }`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    enabled ? "left-5" : "left-0.5"
                  }`} />
                </button>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Test */}
      <Card>
        <h3 className="text-sm font-bold text-white mb-4">Test Bot</h3>
        <div className="flex gap-3">
          <button
            onClick={testBot}
            disabled={testing || !hasTelegram}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#1e3a5f] to-[#2d1b69] text-[#93c5fd] text-sm font-bold font-mono disabled:opacity-50"
          >
            {testing ? "Sending..." : "Send test message"}
          </button>
          {!hasTelegram && (
            <span className="text-xs text-[#475569] font-mono self-center">
              Configure Telegram first in Project Settings
            </span>
          )}
        </div>
        {testResult && (
          <div className={`mt-3 rounded-lg py-2 px-3 text-xs font-mono ${
            testResult.type === "success" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
          }`}>
            {testResult.msg}
          </div>
        )}
      </Card>
    </div>
  );
}
