"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import {
  PageLayout, Topbar, PageTitle, KpiRow, KpiCard, Button, Badge, Footer,
} from "@/app/components/ui";

export default function AgentSessionsPage() {
  const { user, isAdmin } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [turns, setTurns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchSessions();
    const sub = supabase.channel("agent_sessions_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_agent_sessions" }, fetchSessions)
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  async function fetchSessions() {
    const { data } = await supabase.from("cockpit_agent_sessions").select("*").order("started_at", { ascending: false }).limit(100);
    setSessions(data || []);
    setLoading(false);
  }

  async function selectSession(s) {
    if (selectedSession?.id === s.id) { setSelectedSession(null); setTurns([]); return; }
    setSelectedSession(s);
    const { data } = await supabase.from("cockpit_agent_turns").select("*").eq("session_id", s.id).order("created_at");
    setTurns(data || []);
  }

  const filtered = sessions.filter((s) => {
    if (filter === "chat" && s.surface !== "chat") return false;
    if (filter === "telegram" && s.surface !== "telegram") return false;
    if (filter === "mine" && s.user_email !== user?.email) return false;
    return true;
  });

  const totalCost = sessions.reduce((s, x) => s + (parseFloat(x.total_cost_usd) || 0), 0);
  const totalTurns = sessions.reduce((s, x) => s + (x.turn_count || 0), 0);
  const todayCount = sessions.filter((s) => new Date(s.started_at).toDateString() === new Date().toDateString()).length;

  return (
    <PageLayout>
      <Topbar breadcrumb={["Agent", "Sessions"]} actions={<Button variant="ghost" onClick={fetchSessions}>Refresh</Button>} />
      <main style={{ flex: 1, padding: "1.5rem 1.75rem", overflowY: "auto", maxWidth: "1100px", width: "100%", margin: "0 auto" }}>
        <PageTitle title="Sessions" description="Conversation history across all surfaces. Click a session to see every turn." />

        <KpiRow>
          <KpiCard label="Total sessions" value={String(sessions.length)} variant="accent" />
          <KpiCard label="Today" value={String(todayCount)} variant="success" />
          <KpiCard label="Total turns" value={String(totalTurns)} variant="default" />
          <KpiCard label="Total cost" value={`$${totalCost.toFixed(4)}`} variant="warn" />
        </KpiRow>

        <div style={{ display: "flex", gap: "8px", marginBottom: "1rem" }}>
          {["all", "mine", "chat", "telegram"].map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: "5px 11px", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: filter === f ? "var(--bg-3)" : "transparent", color: filter === f ? "var(--text)" : "var(--text-3)", fontSize: "12px", fontWeight: 500, cursor: "pointer" }}>
              {f === "all" ? "All" : f === "mine" ? "My sessions" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {loading ? <p style={{ textAlign: "center", color: "var(--text-3)", padding: "2rem 0" }}>Loading...</p> : filtered.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--text-3)", padding: "2rem 0" }}>No sessions yet. Start a conversation with Steve.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {filtered.map((s) => {
              const expanded = selectedSession?.id === s.id;
              return (
                <article key={s.id} style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
                  <div onClick={() => selectSession(s)} style={{ padding: "1rem 1.25rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <Badge variant="info">{s.surface}</Badge>
                        <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text)" }}>{s.user_email || "Anonymous"}</span>
                        {s.ended_at && <Badge variant="neutral">Ended</Badge>}
                      </div>
                      <div style={{ display: "flex", gap: "16px", fontSize: "11px", color: "var(--text-3)" }}>
                        <span>{new Date(s.started_at).toLocaleString()}</span>
                        <span>{s.turn_count} turns</span>
                        <span>{s.total_input_tokens + s.total_output_tokens} tokens</span>
                        <span>${(parseFloat(s.total_cost_usd) || 0).toFixed(4)}</span>
                      </div>
                    </div>
                    <span style={{ fontSize: "12px", color: "var(--text-3)" }}>{expanded ? "▾" : "▸"}</span>
                  </div>

                  {expanded && (
                    <div style={{ borderTop: "1px solid var(--border)", padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "10px", maxHeight: "400px", overflowY: "auto" }}>
                      {turns.length === 0 && <p style={{ fontSize: "12px", color: "var(--text-3)" }}>No turns recorded.</p>}
                      {turns.map((t) => (
                        <div key={t.id} style={{ display: "flex", flexDirection: "column", gap: "6px", padding: "10px", background: "var(--bg-3)", borderRadius: "var(--radius)", fontSize: "12.5px" }}>
                          {t.user_message && <div><span style={{ color: "var(--text-3)", fontWeight: 600 }}>User:</span> <span style={{ color: "var(--text-2)" }}>{t.user_message}</span></div>}
                          {t.assistant_message && <div><span style={{ color: "var(--accent-text)", fontWeight: 600 }}>Steve:</span> <span style={{ color: "var(--text)" }}>{t.assistant_message}</span></div>}
                          <div style={{ display: "flex", gap: "12px", fontSize: "10px", color: "var(--text-3)" }}>
                            <span>{t.model}</span>
                            <span>{t.input_tokens}+{t.output_tokens} tok</span>
                            <span>${(parseFloat(t.cost_usd) || 0).toFixed(4)}</span>
                            {t.latency_ms && <span>{t.latency_ms}ms</span>}
                            {t.activity && <Badge variant="neutral">{t.activity}</Badge>}
                            {t.error && <Badge variant="danger">Error</Badge>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </PageLayout>
  );
}
