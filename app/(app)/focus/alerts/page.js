"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  PageLayout, Topbar, PageTitle, KpiRow, KpiCard, Badge, Footer,
} from "@/app/components/ui";

const SEVERITY_VARIANT = {
  critical: "danger",
  warning: "warn",
  info: "info",
};

export default function V1AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runChecks();
  }, []);

  async function runChecks() {
    const generated = [];

    const { data: kpis } = await supabase
      .from("cockpit_kpis")
      .select("*")
      .order("date", { ascending: false })
      .limit(1);
    const latest = kpis?.[0];

    const { data: tasks } = await supabase
      .from("cockpit_tasks")
      .select("status")
      .eq("status", "blocked");

    if (!latest) {
      generated.push({
        id: "no-kpi",
        severity: "critical",
        title: "No KPI data",
        message: "No KPI entry has been logged yet. Start tracking your metrics.",
      });
    } else {
      const lastDate = new Date(latest.date);
      const daysSince = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince > 7) {
        generated.push({
          id: "stale-kpi",
          severity: "warning",
          title: "No KPI logged this week",
          message: `Last KPI entry was ${daysSince} days ago (${latest.date}). Log fresh metrics.`,
        });
      }
    }

    const blockedCount = tasks?.length || 0;
    if (blockedCount > 0) {
      generated.push({
        id: "blocked-tasks",
        severity: "critical",
        title: `${blockedCount} blocked task${blockedCount > 1 ? "s" : ""}`,
        message: "There are tasks with 'blocked' status that need attention.",
      });
    }

    // Check: stale features
    const { data: features } = await supabase
      .from("cockpit_features_os")
      .select("name, updated_at, step_5_done")
      .eq("step_5_done", false)
      .order("updated_at", { ascending: true })
      .limit(5);
    (features || []).forEach((f) => {
      const days = Math.floor((Date.now() - new Date(f.updated_at).getTime()) / (1000 * 60 * 60 * 24));
      if (days > 14) {
        generated.push({
          id: `stale-feat-${f.name}`,
          severity: "warning",
          title: `Stale feature: ${f.name}`,
          message: `Not updated for ${days} days.`,
        });
      }
    });

    setAlerts(generated);
    setLoading(false);
  }

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const warningCount = alerts.filter((a) => a.severity === "warning").length;
  const infoCount = alerts.filter((a) => a.severity === "info").length;

  return (
    <PageLayout>
      <Topbar breadcrumb={["Focus", "Alerts"]} />
      <main style={{ flex: 1, padding: "1.5rem 1.75rem", overflowY: "auto", maxWidth: "900px", width: "100%", margin: "0 auto" }}>
        <PageTitle
          title="Alerts"
          description="Auto checks: stale KPIs, blocked tasks, abandoned features. Watch the project's health."
        />

        <KpiRow>
          <KpiCard label="Critical" value={String(criticalCount)} trend="urgent" variant="warn" />
          <KpiCard label="Warnings" value={String(warningCount)} trend="to review" variant="accent" />
          <KpiCard label="Info" value={String(infoCount)} trend="notes" variant="muted" />
          <KpiCard label="Total" value={String(alerts.length)} trend="active" variant="default" />
        </KpiRow>

        {loading ? (
          <p style={{ textAlign: "center", color: "var(--text-3)", padding: "2rem 0" }}>Running checks...</p>
        ) : alerts.length === 0 ? (
          <div style={{ background: "var(--success-bg)", border: "1px solid var(--success)", borderRadius: "var(--radius-lg)", padding: "1.5rem", textAlign: "center", color: "var(--success-text)" }}>
            All clear. No alerts at the moment.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {alerts.map((alert) => (
              <article
                key={alert.id}
                style={{
                  background: "var(--bg-2)",
                  border: "1px solid var(--border)",
                  borderLeft: `3px solid ${
                    alert.severity === "critical" ? "var(--danger)" : alert.severity === "warning" ? "var(--warn)" : "var(--accent)"
                  }`,
                  borderRadius: "var(--radius-lg)",
                  padding: "1rem 1.25rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <Badge variant={SEVERITY_VARIANT[alert.severity] || "neutral"}>{alert.severity}</Badge>
                  <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)", margin: 0 }}>{alert.title}</h3>
                </div>
                <p style={{ fontSize: "12.5px", color: "var(--text-2)", margin: 0, lineHeight: 1.5 }}>{alert.message}</p>
              </article>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </PageLayout>
  );
}
