"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  PageLayout, Topbar, PageTitle, KpiRow, KpiCard, Badge, Footer,
} from "@/app/components/ui";

export default function AgentCostsPage() {
  const [turns, setTurns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTurns();
    const sub = supabase.channel("agent_costs_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_agent_turns" }, fetchTurns)
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  async function fetchTurns() {
    const { data } = await supabase.from("cockpit_agent_turns").select("*").order("created_at", { ascending: false }).limit(500);
    setTurns(data || []);
    setLoading(false);
  }

  // Aggregations
  const now = new Date();
  const thisMonth = turns.filter((t) => new Date(t.created_at).getMonth() === now.getMonth() && new Date(t.created_at).getFullYear() === now.getFullYear());
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = turns.filter((t) => { const d = new Date(t.created_at); return d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear(); });

  const thisMonthCost = thisMonth.reduce((s, t) => s + (parseFloat(t.cost_usd) || 0), 0);
  const lastMonthCost = lastMonth.reduce((s, t) => s + (parseFloat(t.cost_usd) || 0), 0);
  const totalTokens = turns.reduce((s, t) => s + (t.input_tokens || 0) + (t.output_tokens || 0), 0);
  const totalCost = turns.reduce((s, t) => s + (parseFloat(t.cost_usd) || 0), 0);

  // By provider
  const byProvider = {};
  turns.forEach((t) => { byProvider[t.provider] = (byProvider[t.provider] || 0) + (parseFloat(t.cost_usd) || 0); });

  // By activity
  const byActivity = {};
  turns.forEach((t) => { const a = t.activity || "chat"; byActivity[a] = (byActivity[a] || 0) + (parseFloat(t.cost_usd) || 0); });

  // By user (top 5)
  const byUser = {};
  turns.forEach((t) => { const u = t.user_email || "unknown"; byUser[u] = (byUser[u] || 0) + (parseFloat(t.cost_usd) || 0); });
  const topUsers = Object.entries(byUser).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // By surface
  const bySurface = {};
  turns.forEach((t) => { bySurface[t.surface] = (bySurface[t.surface] || 0) + (parseFloat(t.cost_usd) || 0); });

  const row = { background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1rem 1.25rem", marginBottom: "12px" };
  const label = { fontSize: "11px", fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" };

  return (
    <PageLayout>
      <Topbar breadcrumb={["Agent", "Costs"]} />
      <main style={{ flex: 1, padding: "1.5rem 1.75rem", overflowY: "auto", maxWidth: "1100px", width: "100%", margin: "0 auto" }}>
        <PageTitle title="Costs" description="Token usage and cost tracking across all agent activities." />

        <KpiRow>
          <KpiCard label="This month" value={`$${thisMonthCost.toFixed(2)}`} variant="warn" />
          <KpiCard label="Last month" value={`$${lastMonthCost.toFixed(2)}`} variant="muted" />
          <KpiCard label="All time" value={`$${totalCost.toFixed(2)}`} variant="accent" />
          <KpiCard label="Total tokens" value={totalTokens.toLocaleString()} variant="default" />
        </KpiRow>

        {loading ? <p style={{ textAlign: "center", color: "var(--text-3)", padding: "2rem 0" }}>Loading...</p> : turns.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--text-3)", padding: "2rem 0" }}>No agent activity yet. Costs will appear here after Steve starts working.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {/* By provider */}
            <section style={row}>
              <h3 style={label}>Cost by provider</h3>
              {Object.entries(byProvider).sort((a, b) => b[1] - a[1]).map(([provider, cost]) => (
                <div key={provider} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: "12.5px" }}>
                  <span style={{ color: "var(--text-2)" }}>{provider}</span>
                  <span style={{ color: "var(--text)", fontWeight: 500 }}>${cost.toFixed(4)}</span>
                </div>
              ))}
            </section>

            {/* By activity */}
            <section style={row}>
              <h3 style={label}>Cost by activity</h3>
              {Object.entries(byActivity).sort((a, b) => b[1] - a[1]).map(([activity, cost]) => (
                <div key={activity} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: "12.5px" }}>
                  <span style={{ color: "var(--text-2)" }}>{activity}</span>
                  <span style={{ color: "var(--text)", fontWeight: 500 }}>${cost.toFixed(4)}</span>
                </div>
              ))}
            </section>

            {/* By user (top 5) */}
            <section style={row}>
              <h3 style={label}>Top users by cost</h3>
              {topUsers.map(([email, cost]) => (
                <div key={email} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: "12.5px" }}>
                  <span style={{ color: "var(--text-2)" }}>{email}</span>
                  <span style={{ color: "var(--text)", fontWeight: 500 }}>${cost.toFixed(4)}</span>
                </div>
              ))}
              {topUsers.length === 0 && <p style={{ fontSize: "12px", color: "var(--text-3)" }}>No data</p>}
            </section>

            {/* By surface */}
            <section style={row}>
              <h3 style={label}>Cost by surface</h3>
              {Object.entries(bySurface).sort((a, b) => b[1] - a[1]).map(([surface, cost]) => (
                <div key={surface} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: "12.5px" }}>
                  <Badge variant="info">{surface}</Badge>
                  <span style={{ color: "var(--text)", fontWeight: 500 }}>${cost.toFixed(4)}</span>
                </div>
              ))}
              {Object.keys(bySurface).length === 0 && <p style={{ fontSize: "12px", color: "var(--text-3)" }}>No data</p>}
            </section>
          </div>
        )}
      </main>
      <Footer />
    </PageLayout>
  );
}
