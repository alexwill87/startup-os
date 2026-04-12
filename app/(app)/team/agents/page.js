"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  PageLayout, Topbar, PageTitle, KpiRow, KpiCard, Badge, Footer,
} from "@/app/components/ui";

export default function V1AgentsPage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [{ data: configRows }, { data: members }] = await Promise.all([
        supabase.from("cockpit_config").select("key, value"),
        supabase
          .from("cockpit_members")
          .select("*")
          .or("email.ilike.%bot%,email.ilike.%agent%,email.ilike.%assistant%"),
      ]);

      const cfg = {};
      (configRows || []).forEach((r) => (cfg[r.key] = r.value));

      const agentList = [
        {
          id: "in-app-assistant",
          name: "Startup Assistant",
          type: "In-app AI assistant",
          description: "Chat assistant available in the cockpit. Knows the project context, creates tasks, drafts content, helps founders move forward.",
          status: "planned",
          capabilities: ["Chat in-app", "Read project context", "Suggest actions", "Draft content"],
          provider: "configurable",
          model: "configurable",
        },
        {
          id: "telegram-bot",
          name: "Telegram Bot",
          type: "Telegram bot",
          description: "Project assistant that creates tasks, generates summaries, and answers questions about the project with full context.",
          status: cfg.telegram_bot_token ? "active" : "no token",
          capabilities: [
            "/start — Welcome + chat ID",
            "/task [title] — Create a task",
            "/summary — Full project summary",
            "Free text — AI response with project context",
          ],
          provider: cfg.bot_provider || "openrouter",
          model: cfg.bot_model || "anthropic/claude-3-haiku",
        },
      ];

      (members || []).forEach((m) => {
        if (m.email === "bot") return;
        agentList.push({
          id: m.id,
          name: m.name || m.email,
          type: "Registered agent",
          description: m.bio || "Registered agent in cockpit_members",
          status: m.status,
          capabilities: [],
          provider: null,
          model: null,
        });
      });

      setAgents(agentList);
    } catch (err) {
      console.error("Fetch agents error:", err);
    } finally {
      setLoading(false);
    }
  }

  const activeCount = agents.filter((a) => a.status === "active").length;

  return (
    <PageLayout>
      <Topbar breadcrumb={["Team", "Agents"]} />
      <main style={{ flex: 1, padding: "1.5rem 1.75rem", overflowY: "auto", maxWidth: "1100px", width: "100%", margin: "0 auto" }}>
        <PageTitle title="Agents" description="AI agents integrated into the team and their configuration." />

        <KpiRow>
          <KpiCard label="Total" value={String(agents.length)} trend="agents" variant="accent" />
          <KpiCard label="Active" value={String(activeCount)} trend="running" variant="success" />
        </KpiRow>

        {loading ? (
          <p style={{ textAlign: "center", color: "var(--text-3)", padding: "2rem 0" }}>Loading...</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {agents.map((a) => (
              <article
                key={a.id}
                style={{
                  background: "var(--bg-2)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  padding: "1.25rem 1.5rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)", margin: 0 }}>{a.name}</h3>
                  <Badge variant="info">{a.type}</Badge>
                  <Badge variant={a.status === "active" ? "success" : a.status === "planned" ? "warn" : "neutral"}>
                    {a.status}
                  </Badge>
                </div>
                <p style={{ fontSize: "13px", color: "var(--text-2)", margin: "0 0 10px", lineHeight: 1.5 }}>{a.description}</p>
                {a.capabilities && a.capabilities.length > 0 && (
                  <ul style={{ listStyle: "none", padding: 0, margin: "0 0 10px", display: "flex", flexDirection: "column", gap: "4px" }}>
                    {a.capabilities.map((c, i) => (
                      <li key={i} style={{ fontSize: "12px", color: "var(--text-3)", paddingLeft: "12px", position: "relative" }}>
                        <span style={{ position: "absolute", left: 0 }}>·</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                )}
                {(a.provider || a.model) && (
                  <div style={{ display: "flex", gap: "12px", fontSize: "11px", color: "var(--text-3)", paddingTop: "10px", borderTop: "1px solid var(--border)" }}>
                    {a.provider && <span>Provider: <span style={{ color: "var(--text-2)" }}>{a.provider}</span></span>}
                    {a.model && <span>Model: <span style={{ color: "var(--text-2)" }}>{a.model}</span></span>}
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
