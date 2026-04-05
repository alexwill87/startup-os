"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const COLOR = "#06b6d4";

const severityColors = {
  critical: "#ef4444",
  warning: "#eab308",
  info: "#3b82f6",
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const runChecks = async () => {
      const generated = [];

      // Fetch latest KPIs
      const { data: kpis } = await supabase
        .from("cockpit_kpis")
        .select("*")
        .order("date", { ascending: false })
        .limit(1);
      const latest = kpis?.[0];

      // Fetch tasks
      const { data: tasks } = await supabase
        .from("cockpit_tasks")
        .select("status")
        .eq("status", "blocked");

      // Check: No KPI logged recently
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

      // Check: Blocked tasks
      const blockedCount = tasks?.length || 0;
      if (blockedCount > 0) {
        generated.push({
          id: "blocked-tasks",
          severity: "critical",
          title: `${blockedCount} blocked task${blockedCount > 1 ? "s" : ""}`,
          message: "There are tasks with 'blocked' status that need attention.",
        });
      }

      // Check: Burn rate (from cockpit_resources admin)
      const { data: expenses } = await supabase
        .from("cockpit_resources")
        .select("description")
        .eq("category", "admin");
      let totalBurn = 0;
      (expenses || []).forEach((e) => {
        const match = e.description?.match(/cost:\s*(\d+(?:\.\d+)?)/i);
        if (match) totalBurn += parseFloat(match[1]);
      });
      if (totalBurn > 50) {
        generated.push({
          id: "burn-high",
          severity: "warning",
          title: "Burn rate above 50 EUR/mo",
          message: `Current monthly burn is ${totalBurn.toFixed(2)} EUR. Review expenses.`,
        });
      }

      // Check: No pro users yet
      if (latest && (latest.users_pro || 0) === 0) {
        generated.push({
          id: "no-pro",
          severity: "info",
          title: "No pro users yet",
          message: "Target: at least 1 paying user. Focus on conversion.",
        });
      }

      // Check: Low active users
      if (latest && (latest.users_active_7d || 0) < 10) {
        generated.push({
          id: "low-active",
          severity: "info",
          title: "Active users below target",
          message: `${latest.users_active_7d || 0}/10 active users (7d). Min target is 10.`,
        });
      }

      // Check: Platforms live below target
      if (latest && (latest.platforms_live || 0) < 6) {
        generated.push({
          id: "low-platforms",
          severity: "warning",
          title: "Platforms below min target",
          message: `${latest.platforms_live || 0}/6 platforms live. Min target is 6.`,
        });
      }

      // All good
      if (generated.length === 0) {
        generated.push({
          id: "all-good",
          severity: "info",
          title: "All systems nominal",
          message: "No alerts triggered. Everything looks healthy.",
        });
      }

      // Sort by severity
      const order = { critical: 0, warning: 1, info: 2 };
      generated.sort((a, b) => order[a.severity] - order[b.severity]);

      setAlerts(generated);
      setLoading(false);
    };

    runChecks();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts"
        subtitle="Automated project health checks"
        color={COLOR}
      />

      {loading ? (
        <p className="text-zinc-500 text-sm">Running checks...</p>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <Card key={alert.id}>
              <div className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold"
                  style={{
                    backgroundColor: severityColors[alert.severity] + "20",
                    color: severityColors[alert.severity],
                  }}
                >
                  {alert.severity === "critical"
                    ? "!!"
                    : alert.severity === "warning"
                    ? "!"
                    : "i"}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white text-sm font-semibold">{alert.title}</h3>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full uppercase"
                      style={{
                        backgroundColor: severityColors[alert.severity] + "20",
                        color: severityColors[alert.severity],
                      }}
                    >
                      {alert.severity}
                    </span>
                  </div>
                  <p className="text-zinc-400 text-sm">{alert.message}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
