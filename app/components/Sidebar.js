"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/lib/supabase";

const PILLARS = [
  {
    id: "pourquoi",
    label: "Why",
    color: "#3b82f6",
    items: [
      { href: "/pourquoi/mission", label: "Mission & Vision" },
      { href: "/pourquoi/vision-strategy", label: "Strategy Notes" },
      { href: "/pourquoi/decisions", label: "Decisions" },
    ],
  },
  {
    id: "equipe",
    label: "Team",
    color: "#8b5cf6",
    items: [
      { href: "/equipe/members", label: "Members" },
      { href: "/equipe/roles", label: "Roles & Skills" },
      { href: "/equipe/profile", label: "My Profile" },
    ],
  },
  {
    id: "ressources",
    label: "Resources",
    color: "#10b981",
    items: [
      { href: "/ressources/links", label: "Links & Docs" },
      { href: "/ressources/files", label: "Files" },
      { href: "/ressources/gallery", label: "Gallery" },
      { href: "/ressources/tools", label: "Tools & APIs" },
      { href: "/ressources/budget", label: "Budget" },
    ],
  },
  {
    id: "projet",
    label: "Project",
    color: "#f59e0b",
    items: [
      { href: "/projet/overview", label: "Overview" },
      { href: "/projet/board", label: "Board" },
      { href: "/projet/roadmap", label: "Roadmap" },
      { href: "/projet/docs", label: "Documentation" },
      { href: "/projet/retro", label: "Retrospective" },
    ],
  },
  {
    id: "clients",
    label: "Market",
    color: "#ec4899",
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
    items: [
      { href: "/setup/checklist", label: "Checklist" },
      { href: "/setup/config", label: "Project Settings" },
      { href: "/setup/api-keys", label: "API Keys" },
      { href: "/setup/bot", label: "Bot" },
      { href: "/setup/roadmap-os", label: "Product Roadmap" },
      { href: "/setup/changelog", label: "Changelog" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { builder } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
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
            Project OS
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
        <Link
          href="/"
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] transition-all ${
            pathname === "/"
              ? "bg-[#1e293b] text-white font-semibold"
              : "text-[#64748b] hover:text-white hover:bg-[#161b22]"
          }`}
        >
          {collapsed ? "H" : "Home"}
        </Link>
        <Link
          href="/activity"
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] transition-all ${
            pathname === "/activity"
              ? "bg-[#1e293b] text-white font-semibold"
              : "text-[#64748b] hover:text-white hover:bg-[#161b22]"
          }`}
        >
          {collapsed ? "A" : "Activity"}
        </Link>
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
