"use client";
import PillarDashboard from "@/app/components/PillarDashboard";

export default function RessourcesPage() {
  return (
    <PillarDashboard
      pillar="resources"
      label="Resources"
      color="#10b981"
      subpages={[
        { label: "Links", href: "/ressources/links" },
        { label: "Files", href: "/ressources/files" },
        { label: "Gallery", href: "/ressources/gallery" },
        { label: "Tools", href: "/ressources/tools" },
        { label: "Budget", href: "/ressources/budget" },
      ]}
    />
  );
}
