"use client";
import PillarDashboard from "@/app/components/PillarDashboard";

export default function FinancesPage() {
  return (
    <PillarDashboard
      pillar="finances"
      label="Finances"
      color="#ef4444"
      subpages={[
        { label: "Budget", href: "/finances/budget-track" },
        { label: "Costs", href: "/finances/costs" },
        { label: "Revenue", href: "/finances/revenue" },
      ]}
    />
  );
}
