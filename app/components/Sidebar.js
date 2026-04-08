"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/lib/supabase";

const ALL_PILLARS = [
  {
    id: "pourquoi",
    label: "Purpose",
    color: "#3b82f6",
    access: ["admin", "cofounder", "mentor", "observer"],
    items: [
      { href: "/pourquoi/mission", label: "Vision" },
      { href: "/objectives", label: "Goals" },
    ],
  },
  {
    id: "equipe",
    label: "Team",
    color: "#8b5cf6",
    access: ["admin", "cofounder", "mentor"],
    items: [
      { href: "/equipe/members", label: "Members" },
      { href: "/equipe/agents", label: "Agents" },
      { href: "/equipe/roles", label: "Roles" },
      { href: "/equipe/onboarding", label: "Onboarding" },
    ],
  },
  {
    id: "ressources",
    label: "Resources",
    color: "#10b981",
    access: ["admin", "cofounder", "mentor"],
    items: [
      { href: "/projet/docs", label: "Documentation" },
      { href: "/ressources/links", label: "Links" },
      { href: "/ressources/files", label: "Files" },
    ],
  },
  {
    id: "projet",
    label: "Product",
    color: "#f59e0b",
    access: ["admin", "cofounder", "mentor"],
    items: [
      { href: "/projet/roadmap", label: "Roadmap" },
      { href: "/projet/features", label: "Features" },
      { href: "/projet/find", label: "Find" },
      { href: "/projet/retro", label: "Retrospective" },
      { href: "/feedback", label: "Feedback" },
    ],
  },
  {
    id: "worklist",
    label: "WorkList",
    color: "#f97316",
    access: ["admin", "cofounder", "mentor"],
    items: [
      { href: "/projet/tasks", label: "Tasks" },
      { href: "/projet/workflow", label: "Workflow" },
    ],
  },
  {
    id: "clients",
    label: "Market",
    color: "#ec4899",
    access: ["admin", "cofounder", "mentor"],
    items: [
      { href: "/clients/personas", label: "Personas" },
      { href: "/clients/competitors", label: "Competitors" },
      { href: "/clients/feedback", label: "User Feedback" },
    ],
  },
  {
    id: "finances",
    label: "Finances",
    color: "#ef4444",
    access: ["admin", "cofounder", "mentor"],
    items: [
      { href: "/finances/budget-track", label: "Budget Tracker" },
      { href: "/finances/costs", label: "Costs" },
      { href: "/finances/revenue", label: "Revenue" },
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    color: "#06b6d4",
    access: ["admin", "cofounder", "mentor", "observer"],
    items: [
      { href: "/analytics/kpis", label: "KPIs" },
      { href: "/analytics/alerts", label: "Alerts" },
      { href: "/analytics/health", label: "Project Health" },
    ],
  },
  {
    id: "setup",
    label: "Config",
    color: "#64748b",
    access: ["admin"],
    items: [
      { href: "/setup/config", label: "Project Settings" },
      { href: "/equipe/profile", label: "My Profile" },
      { href: "/setup/checklist", label: "Checklist" },
      { href: "/setup/bot", label: "Bot" },
      { href: "/guide", label: "Guide" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { builder, member } = useAuth();
  const userRole = member?.role || "observer";
  const PILLARS = ALL_PILLARS.filter((p) => p.access.includes(userRole));
  const [collapsed, setCollapsed] = useState(false);
  const [projectName, setProjectName] = useState("Project OS");

  useEffect(() => {
    supabase.from("cockpit_vision").select("body").eq("topic", "other").eq("title", "config:project_name").maybeSingle()
      .then(({ data }) => { if (data?.body) setProjectName(data.body); });
  }, []);
  const [openPillars, setOpenPillars] = useState(() => {
    // Open the pillar that matches current path
    const current = PILLARS.find((p) => pathname.startsWith(`/${p.id}`));
    return current ? { [current.id]: true } : { pourquoi: true };
  });

  function togglePillar(id) {
    setOpenPillars((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function isActive(href) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside
      className={`fixed top-0 left-0 h-screen flex flex-col border-r transition-all duration-200 z-50 ${
        collapsed ? "w-[60px]" : "w-[260px]"
      }`}
      style={{ background: "#0a0e17", borderColor: "var(--border)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--border)" }}>
        {!collapsed && (
          <Link href="/" className="text-[15px] font-extrabold text-white tracking-tight">
            {projectName}
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-[#475569] hover:text-white transition-colors text-sm"
        >
          {collapsed ? ">" : "<"}
        </button>
      </div>

      {/* Home + Activity */}
      <div className="px-2 pt-3 pb-1 space-y-0.5">
        <SidebarLink href="/" label="Home" short="H" pathname={pathname} collapsed={collapsed} />
        {userRole !== "observer" && (
          <>
            <SidebarLink href="/activity" label="Activity" short="A" pathname={pathname} collapsed={collapsed} />
            <SidebarLink href="/leaderboard" label="Leaderboard" short="*" pathname={pathname} collapsed={collapsed} />
          </>
        )}
      </div>

      {/* Pillars */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {PILLARS.map((pillar) => {
          const isOpen = openPillars[pillar.id];
          const pillarActive = pathname.startsWith(`/${pillar.id}`);

          return (
            <div key={pillar.id} className="mb-1">
              <div
                onClick={() => togglePillar(pillar.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] transition-all duration-150 cursor-pointer ${
                  pillarActive
                    ? "text-white font-semibold bg-[#161b22]"
                    : "text-[#64748b] hover:text-white hover:bg-[#161b22]"
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: pillar.color }}
                />
                {!collapsed && (
                  <>
                    <Link href={`/${pillar.id}`} className="flex-1 text-left hover:underline" onClick={(e) => e.stopPropagation()}>
                      {pillar.label}
                    </Link>
                    <span className="text-[10px] text-[#475569]" onClick={() => togglePillar(pillar.id)}>
                      {isOpen ? "−" : "+"}
                    </span>
                  </>
                )}
              </div>

              {isOpen && !collapsed && (
                <div className="ml-4 mt-1 space-y-0.5 border-l border-[#1e293b]">
                  {pillar.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`block px-3 py-2 rounded-r-md text-[12.5px] transition-all duration-150 -ml-px ${
                        isActive(item.href)
                          ? "text-white font-medium border-l-2"
                          : "text-[#475569] hover:text-[#94a3b8] hover:bg-[#161b22] border-l-2 border-transparent"
                      }`}
                      style={isActive(item.href) ? { color: pillar.color, borderLeftColor: pillar.color } : {}}
                    >
                      <span className="flex items-center gap-2">
                        {item.label}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User */}
      <div
        className="px-3 py-3 border-t flex items-center justify-between"
        style={{ borderColor: "var(--border)" }}
      >
        {!collapsed && builder && (
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
              style={{ background: builder.color + "33", color: builder.color }}
            >
              {builder.name[0]}
            </span>
            <span className="text-[11px] text-[#94a3b8] truncate">
              {builder.name}
            </span>
          </div>
        )}
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-[10px] text-[#475569] hover:text-[#ef4444] transition-colors"
        >
          {collapsed ? "X" : "Logout"}
        </button>
      </div>
    </aside>
  );
}

function SidebarLink({ href, label, short, pathname, collapsed }) {
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] transition-all ${
        active
          ? "bg-[#1e293b] text-white font-semibold"
          : "text-[#64748b] hover:text-white hover:bg-[#161b22]"
      }`}
    >
      {collapsed ? short : label}
    </Link>
  );
}
