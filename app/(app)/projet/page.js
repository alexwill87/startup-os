"use client";
import PillarDashboard from "@/app/components/PillarDashboard";

export default function ProjetPage() {
  return (
    <PillarDashboard
      pillar="project"
      label="Project"
      color="#f59e0b"
      subpages={[
        { label: "Overview", href: "/projet/overview" },
        { label: "Board", href: "/projet/board" },
        { label: "Roadmap", href: "/projet/roadmap" },
        { label: "Docs", href: "/projet/docs" },
        { label: "Retro", href: "/projet/retro" },
      ]}
    />
  );
}
