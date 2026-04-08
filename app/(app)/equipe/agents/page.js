"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const COLOR = "#8b5cf6";

export default function AgentsPage() {
  const { isAdmin } = useAuth();
  const [agents, setAgents] = useState([]);
  const [botConfig, setBotConfig] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [{ data: configRows }, { data: members }] = await Promise.all([
        supabase.from("cockpit_config").select("key, value"),
        supabase.from("cockpit_members").select("*").or("email.ilike.%bot%,email.ilike.%agent%,email.ilike.%athena%"),
      ]);

      const cfg = {};
      (configRows || []).forEach((r) => (cfg[r.key] = r.value));
      setBotConfig(cfg);

      // Build agent list — always include the Telegram bot
      const agentList = [
        {
          id: "telegram-bot",
          name: "@YourBot",
          type: "Telegram Bot",
          description: "PM assistant that creates tasks, generates summaries, and answers questions about the project with full context.",
          status: cfg.telegram_bot_token ? "active" : "no token",
          capabilities: [
            "/start — Welcome + chat ID",
            "/task [title] — Create a task",
            "/summary — Full project summary",
            "Free text — AI response with project context",
          ],
          provider: cfg.bot_provider || "openrouter",
          model: cfg.bot_model || "anthropic/claude-3-haiku",
          config: "/setup/bot",
        },
      ];

      // Add any agent members from DB
      (members || []).forEach((m) => {
        if (m.email === "bot" || m.name === "RadarBot") return; // skip bot activity entries
        agentList.push({
          id: m.id,
          name: m.name || m.email,
          type: "AI Agent",
          description: m.bio || "Registered agent in cockpit_members",
          status: m.status,
          capabilities: [],
          provider: null,
          model: null,
          config: null,
        });
      });

      setAgents(agentList);
    } catch (err) {
      console.error("Fetch agents error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <PageHeader title="Agents" subtitle="AI agents integrated into the team" color={COLOR} />

      {loading ? (
        <p className="text-sm text-[#475569] text-center py-8">Loading agents...</p>
      ) : agents.length === 0 ? (
        <Card>
          <p className="text-sm text-[#475569] text-center py-8">No agents configured yet.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {agents.map((agent) => (
            <Card key={agent.id} className="border-l-2" style={{ borderLeftColor: agent.status === "active" ? "#10b981" : "#f59e0b" }}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-lg font-bold shrink-0">
                  {agent.type === "Telegram Bot" ? "T" : "A"}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-white">{agent.name}</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1e293b] text-[#64748b]">{agent.type}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      agent.status === "active" ? "bg-green-400/10 text-green-400" : "bg-amber-400/10 text-amber-400"
                    }`}>
                      {agent.status}
                    </span>
                  </div>
                  <p className="text-sm text-[#94a3b8] mt-1">{agent.description}</p>

                  {agent.provider && (
                    <p className="text-[10px] text-[#475569] font-mono mt-2">
                      Provider: {agent.provider} / Model: {agent.model}
                    </p>
                  )}

                  {agent.capabilities.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <p className="text-[10px] font-bold text-[#64748b] uppercase">Capabilities</p>
                      {agent.capabilities.map((cap, i) => (
                        <p key={i} className="text-xs text-[#94a3b8] font-mono">{cap}</p>
                      ))}
                    </div>
                  )}

                  {agent.config && isAdmin && (
                    <a href={agent.config} className="inline-block mt-3 text-[10px] font-bold text-purple-400 hover:underline">
                      Configure
                    </a>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
