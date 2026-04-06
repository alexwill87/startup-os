"use client";
import PillarDashboard from "@/app/components/PillarDashboard";

export default function ClientsPage() {
  return (
    <PillarDashboard
      pillar="market"
      label="Market"
      color="#ec4899"
      subpages={[
        { label: "Personas", href: "/clients/personas" },
        { label: "Competitors", href: "/clients/competitors" },
        { label: "Feedback", href: "/clients/feedback" },
      ]}
    />
  );
}
