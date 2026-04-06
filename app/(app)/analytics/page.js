"use client";
import PillarDashboard from "@/app/components/PillarDashboard";

export default function AnalyticsPage() {
  return (
    <PillarDashboard
      pillar="analytics"
      label="Analytics"
      color="#06b6d4"
      subpages={[
        { label: "KPIs", href: "/analytics/kpis" },
        { label: "Alerts", href: "/analytics/alerts" },
        { label: "Health", href: "/analytics/health" },
      ]}
    />
  );
}
