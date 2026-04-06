"use client";
import PillarDashboard from "@/app/components/PillarDashboard";

export default function PourquoiPage() {
  return (
    <PillarDashboard
      pillar="why"
      label="Why"
      color="#3b82f6"
      subpages={[
        { label: "Vision", href: "/pourquoi/mission" },
        { label: "Notes", href: "/pourquoi/vision-strategy" },
        { label: "Decisions", href: "/pourquoi/decisions" },
      ]}
    />
  );
}
