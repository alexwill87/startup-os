"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  PageLayout, Topbar, PageTitle, KpiRow, KpiCard, Badge, Button, Footer,
} from "@/app/components/ui";

export default function SupabaseSettingsPage() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    testConnection();
  }, []);

  async function testConnection() {
    try {
      const { data, error } = await supabase.from("cockpit_config").select("key").limit(1);
      if (!error) {
        setConnected(true);
        // List known tables by querying each
        const knownTables = [
          "cockpit_members", "cockpit_projects", "cockpit_features_os", "cockpit_sprints",
          "cockpit_comments", "cockpit_vision", "cockpit_config", "cockpit_activity",
          "cockpit_feedback", "cockpit_kpis", "cockpit_resources", "cockpit_tasks",
          "cockpit_agent_docs", "cockpit_agent_memory", "cockpit_agent_sessions",
          "cockpit_agent_turns", "cockpit_api_keys_v2", "cockpit_agent_models", "cockpit_agent_user_prefs",
        ];
        const results = [];
        for (const t of knownTables) {
          const { count, error: countErr } = await supabase.from(t).select("*", { count: "exact", head: true });
          results.push({ name: t, rows: countErr ? "error" : count, status: countErr ? "error" : "ok" });
        }
        setTables(results);
      }
    } catch {
      setConnected(false);
    }
    setLoading(false);
  }

  const okTables = tables.filter((t) => t.status === "ok").length;
  const totalRows = tables.filter((t) => t.status === "ok").reduce((s, t) => s + (t.rows || 0), 0);

  return (
    <PageLayout>
      <Topbar breadcrumb={["Settings", "Supabase"]} actions={<Button variant="ghost" onClick={testConnection}>Test connection</Button>} />
      <main style={{ flex: 1, padding: "1.5rem 1.75rem", overflowY: "auto", maxWidth: "1100px", width: "100%", margin: "0 auto" }}>
        <PageTitle title="Supabase" description="Database connection status and table inventory." />

        <KpiRow>
          <KpiCard label="Status" value={connected ? "Connected" : "Error"} variant={connected ? "success" : "warn"} />
          <KpiCard label="Tables" value={String(okTables)} trend={`of ${tables.length}`} variant="accent" />
          <KpiCard label="Total rows" value={String(totalRows)} variant="default" />
        </KpiRow>

        {loading ? <p style={{ textAlign: "center", color: "var(--text-3)", padding: "2rem 0" }}>Testing connection...</p> : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {tables.map((t) => (
              <div key={t.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", fontSize: "13px" }}>
                <span style={{ color: "var(--text)", fontWeight: 500 }}>{t.name}</span>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "11px", color: "var(--text-3)" }}>{t.rows === "error" ? "—" : `${t.rows} rows`}</span>
                  <Badge variant={t.status === "ok" ? "success" : "danger"}>{t.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </PageLayout>
  );
}
