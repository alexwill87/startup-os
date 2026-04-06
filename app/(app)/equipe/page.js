"use client";
import PillarDashboard from "@/app/components/PillarDashboard";

export default function EquipePage() {
  return (
    <PillarDashboard
      pillar="team"
      label="Team"
      color="#8b5cf6"
      subpages={[
        { label: "Members", href: "/equipe/members" },
        { label: "Roles", href: "/equipe/roles" },
        { label: "My Profile", href: "/equipe/profile" },
      ]}
    />
  );
}
