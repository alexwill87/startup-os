"use client";

import { useMembers } from "@/lib/AuthProvider";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";
import Link from "next/link";

const COLOR = "#8b5cf6";

const ROLE_DEFS = [
  { id: "admin", label: "Admin", color: "#ef4444", icon: "A",
    description: "Full control over the cockpit. Manages settings, API keys, bot, and member access.",
    can: ["Everything cofounders can do", "Manage API keys and bot config", "Invite/revoke members", "Modify workflow template", "Access all settings"],
  },
  { id: "cofounder", label: "Co-founder", color: "#3b82f6", icon: "C",
    description: "Core team. Proposes, votes, and builds. Full visibility on all pillars.",
    can: ["Create and edit goals, features, tasks", "Vote on features (2/3 to validate)", "Approve/reject goals", "Manage their profile and tasks", "View all data"],
  },
  { id: "mentor", label: "Mentor", color: "#10b981", icon: "M",
    description: "Read-only access with ability to comment, vote, and advise.",
    can: ["View all pillars (read-only)", "Comment on goals and vision", "Vote agree/disagree on decisions", "Validate objectives", "Share expertise"],
  },
  { id: "observer", label: "Observer", color: "#64748b", icon: "O",
    description: "Limited view. Sees the mission, KPIs, and can give feedback.",
    can: ["View Purpose (Vision + Goals)", "View Analytics (KPIs)", "Submit feedback", "Follow project progress"],
  },
];

const ORG_CHART = [
  { area: "Direction & Strategy", roles: ["admin", "cofounder"], agents: [] },
  { area: "Product & Features", roles: ["cofounder"], agents: ["Claude Code"] },
  { area: "Marketing & Growth", roles: ["cofounder", "mentor"], agents: [] },
  { area: "Finance & Operations", roles: ["admin", "cofounder"], agents: [] },
  { area: "Quality & Control", roles: ["mentor", "cofounder"], agents: ["Bot Telegram"] },
  { area: "Community & Support", roles: ["observer", "mentor"], agents: ["Bot Telegram"] },
];

export default function RolesPage() {
  const members = useMembers();

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <PageHeader title="Roles & Organization" subtitle="Who does what in the team" color={COLOR} />

      {/* Role definitions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ROLE_DEFS.map((role) => {
          const roleMembers = members.filter((m) => m.role === role.id);
          return (
            <Card key={role.id} className="border-l-2" style={{ borderLeftColor: role.color }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-extrabold text-white" style={{ backgroundColor: role.color }}>
                  {role.icon}
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">{role.label}</h3>
                  <span className="text-[10px] text-[#475569]">{roleMembers.length} member{roleMembers.length !== 1 ? "s" : ""}</span>
                </div>
              </div>
              <p className="text-xs text-[#94a3b8] mb-3">{role.description}</p>
              <div className="space-y-1">
                {role.can.map((c, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[10px] mt-0.5" style={{ color: role.color }}>+</span>
                    <span className="text-[10px] text-[#64748b]">{c}</span>
                  </div>
                ))}
              </div>
              {roleMembers.length > 0 && (
                <div className="flex gap-1.5 mt-3 pt-3 border-t border-[#1e293b] flex-wrap">
                  {roleMembers.map((m) => (
                    <Link key={m.id} href={`/equipe/member/${m.id}`}
                      className="text-[10px] font-mono px-2 py-0.5 rounded-full hover:underline"
                      style={{ color: role.color, backgroundColor: role.color + "15" }}>
                      {m.name || m.email}
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Organigramme */}
      <div>
        <h2 className="text-sm font-bold text-[#64748b] uppercase tracking-wider mb-4">Organization Chart</h2>
        <div className="space-y-3">
          {ORG_CHART.map((area) => (
            <Card key={area.area}>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-white">{area.area}</h3>
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {area.roles.map((r) => {
                      const def = ROLE_DEFS.find((d) => d.id === r);
                      const ms = members.filter((m) => m.role === r);
                      return ms.map((m) => (
                        <Link key={m.id} href={`/equipe/member/${m.id}`}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold hover:opacity-80 transition"
                          style={{ color: def?.color, backgroundColor: (def?.color || "#475569") + "15" }}>
                          <span className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white" style={{ backgroundColor: m.color || def?.color }}>
                            {(m.name || "?").charAt(0)}
                          </span>
                          {m.name || m.email}
                        </Link>
                      ));
                    }).flat()}
                    {area.agents.map((a) => (
                      <span key={a} className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold text-purple-400 bg-purple-400/10">
                        <span className="w-4 h-4 rounded-full bg-purple-500/30 flex items-center justify-center text-[8px]">A</span>
                        {a}
                      </span>
                    ))}
                    {area.roles.every((r) => members.filter((m) => m.role === r).length === 0) && area.agents.length === 0 && (
                      <span className="text-[10px] text-[#334155] italic">No one assigned</span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
