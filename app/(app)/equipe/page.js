"use client";

import { useMembers } from "@/lib/AuthProvider";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";
import Link from "next/link";

const COLOR = "#8b5cf6";

const ROLE_ORDER = ["admin", "cofounder", "mentor", "observer"];
const ROLE_META = {
  admin: { label: "Administrators", color: "#ef4444" },
  cofounder: { label: "Co-founders", color: "#3b82f6" },
  mentor: { label: "Mentors", color: "#10b981" },
  observer: { label: "Observers", color: "#64748b" },
};

export default function TeamPage() {
  const members = useMembers();

  const grouped = {};
  ROLE_ORDER.forEach((r) => { grouped[r] = []; });
  members.forEach((m) => {
    const role = ROLE_ORDER.includes(m.role) ? m.role : "observer";
    grouped[role].push(m);
  });

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <PageHeader title="Team" subtitle={`${members.length} members across the project`} color={COLOR} />

      {ROLE_ORDER.map((role) => {
        const roleMembers = grouped[role];
        if (roleMembers.length === 0) return null;
        const meta = ROLE_META[role];

        return (
          <div key={role}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
              <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: meta.color }}>
                {meta.label}
              </h2>
              <span className="text-[10px] text-[#475569] font-mono">({roleMembers.length})</span>
            </div>

            <div className="space-y-3">
              {roleMembers.map((m) => (
                <Card key={m.id}>
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-extrabold text-white shrink-0"
                      style={{ backgroundColor: m.color || "#3b82f6" }}
                    >
                      {(m.name || m.email || "?").charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white">{m.name || m.email}</h3>
                        {m.builder && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1e293b] text-[#64748b]">
                            Builder {m.builder}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            m.status === "active" ? "bg-green-400/10 text-green-400" : "bg-amber-400/10 text-amber-400"
                          }`}
                        >
                          {m.status}
                        </span>
                      </div>
                      <p className="text-xs text-[#64748b] font-mono">{m.email}</p>
                      {m.bio && <p className="text-xs text-[#94a3b8] mt-1 truncate">{m.bio}</p>}
                      {(m.skills || []).length > 0 && (
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {m.skills.slice(0, 5).map((s, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ color: meta.color, backgroundColor: meta.color + "15" }}>
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      {/* Quick links */}
      <div className="flex gap-3 flex-wrap pt-4 border-t border-[#1e293b]">
        <Link href="/equipe/members" className="px-4 py-2 text-xs font-semibold rounded-lg text-[#64748b] bg-[#0d1117] border border-[#1e293b] hover:border-[#334155] hover:text-white transition">
          Manage Members
        </Link>
        <Link href="/equipe/agents" className="px-4 py-2 text-xs font-semibold rounded-lg text-[#64748b] bg-[#0d1117] border border-[#1e293b] hover:border-[#334155] hover:text-white transition">
          Agents
        </Link>
        <Link href="/equipe/roles" className="px-4 py-2 text-xs font-semibold rounded-lg text-[#64748b] bg-[#0d1117] border border-[#1e293b] hover:border-[#334155] hover:text-white transition">
          Roles
        </Link>
        <Link href="/equipe/onboarding" className="px-4 py-2 text-xs font-semibold rounded-lg text-[#64748b] bg-[#0d1117] border border-[#1e293b] hover:border-[#334155] hover:text-white transition">
          Onboarding
        </Link>
      </div>
    </div>
  );
}
