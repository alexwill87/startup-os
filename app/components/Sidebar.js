"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth, useProject } from "@/lib/AuthProvider";
import { supabase } from "@/lib/supabase";
import { V1_PILLARS } from "@/lib/v1-pages";

export default function Sidebar() {
  const pathname = usePathname();
  const { builder, member } = useAuth();
  const userRole = member?.role || "observer";
  const project = useProject();
  const [collapsed, setCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-sidebar", collapsed ? "collapsed" : "expanded");
  }, [collapsed]);

  const [openPillars, setOpenPillars] = useState(() => {
    const current = V1_PILLARS.find(
      (p) => p.id !== "home" && (pathname === `/${p.root}` || pathname.startsWith(`/${p.root}/`))
    );
    return current ? { [current.id]: true } : { focus: true };
  });

  function togglePillar(id) {
    setOpenPillars((prev) => (prev[id] ? {} : { [id]: true }));
  }

  // Filter pillars by role
  const ADMIN_ONLY = ["settings", "temp-cockpit"];
  const pillars = V1_PILLARS.filter((p) => {
    if (p.id === "home") return false; // Home is rendered separately
    if (ADMIN_ONLY.includes(p.id) && userRole !== "admin") return false;
    return true;
  });

  return (
    <aside
      className={`fixed top-0 left-0 h-screen flex-col border-r transition-all duration-200 z-40 hidden md:flex ${
        collapsed ? "w-[60px]" : "w-[260px]"
      }`}
      style={{ background: "var(--bg-2)", borderColor: "var(--border)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        {!collapsed && (
          <Link
            href="/"
            className="flex items-center gap-2 text-[15px] font-extrabold tracking-tight"
            style={{ color: "var(--text)" }}
          >
            {project.logo && (
              <img src={project.logo} alt="" className="w-6 h-6 rounded object-contain" />
            )}
            {project.name || "..."}
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="transition-colors text-sm hover:text-[var(--text)]"
          style={{ color: "var(--text-3)" }}
        >
          {collapsed ? ">" : "<"}
        </button>
      </div>

      {/* Home */}
      <div className="px-2 pt-3 pb-1">
        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-2 mx-1 rounded-md text-[13px] transition-colors hover:bg-[var(--bg-3)] hover:text-[var(--text)]"
          style={
            pathname === "/"
              ? { background: "var(--bg-3)", color: "var(--text)", fontWeight: 500 }
              : { color: "var(--text-2)" }
          }
        >
          {collapsed ? "H" : "Home"}
        </Link>
      </div>

      {/* Pillars */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {pillars.map((p) => {
          const isOpen = openPillars[p.id];
          const pillarActive =
            pathname === `/${p.root}` || pathname.startsWith(`/${p.root}/`);

          return (
            <div key={p.id} className="mb-0.5">
              <Link
                href={`/${p.root}`}
                onClick={() => togglePillar(p.id)}
                className="block px-3 py-2 mx-1 rounded-md text-[13px] transition-colors hover:bg-[var(--bg-3)] hover:text-[var(--text)]"
                style={
                  pillarActive
                    ? { color: "var(--text)", background: "var(--bg-3)", fontWeight: 500 }
                    : { color: "var(--text-2)" }
                }
              >
                {!collapsed && p.label}
                {collapsed && p.label[0]}
              </Link>
              {isOpen && !collapsed && p.items.length > 0 && (
                <div
                  className="mt-1 mx-1 mb-1 rounded-md py-1"
                  style={{ background: "var(--bg-3)", border: "1px solid var(--border)" }}
                >
                  {p.items.map((item) => {
                    const itemActive = pathname === `/${item.slug}`;
                    return (
                      <Link
                        key={item.slug}
                        href={`/${item.slug}`}
                        className="block mx-1 px-3 py-1.5 rounded text-[12.5px] transition-colors hover:bg-[var(--border-strong)] hover:text-[var(--text)]"
                        style={
                          itemActive
                            ? {
                                color: "var(--text)",
                                background: "var(--border-strong)",
                                fontWeight: 500,
                              }
                            : { color: "var(--text-3)" }
                        }
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Personal menu */}
      {builder && !collapsed && (
        <div className="border-t" style={{ borderColor: "var(--border)" }}>
          <div
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="px-3 py-2.5 flex items-center justify-between cursor-pointer transition-colors hover:bg-[var(--bg-3)]"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                style={{ background: "var(--bg-3)", color: "var(--text-2)" }}
              >
                {builder.name[0]}
              </span>
              <span
                className="text-[12px] font-semibold truncate"
                style={{ color: "var(--text)" }}
              >
                {builder.name}
              </span>
            </div>
            <span className="text-[10px]" style={{ color: "var(--text-3)" }}>
              {userMenuOpen ? "▾" : "▸"}
            </span>
          </div>
          {userMenuOpen && (
            <div
              className="ml-4 pb-2 space-y-0.5 border-l"
              style={{ borderColor: "var(--border)" }}
            >
              {[
                { href: "/me/profile", label: "Profile" },
                { href: "/me/onboarding", label: "Onboarding" },
                { href: "/me/preferences", label: "Preferences" },
                { href: "/me/activity", label: "Activity" },
                { href: "/me/resources", label: "Resources" },
              ].map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block px-3 py-1.5 rounded-r-md text-[12px] transition-colors hover:bg-[var(--bg-3)] hover:text-[var(--text)]"
                    style={
                      active
                        ? { color: "var(--text)", fontWeight: 500, background: "var(--bg-3)" }
                        : { color: "var(--text-3)" }
                    }
                  >
                    {item.label}
                  </Link>
                );
              })}
              <button
                onClick={() => supabase.auth.signOut()}
                className="block w-full text-left px-3 py-1.5 text-[12px] transition-colors hover:text-[var(--danger)]"
                style={{ color: "var(--text-3)", background: "transparent", border: "none", cursor: "pointer" }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      )}
      {collapsed && (
        <div className="px-2 py-2 border-t" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-[10px] transition-colors hover:text-[var(--danger)]"
            style={{ color: "var(--text-3)", background: "transparent", border: "none", cursor: "pointer" }}
          >
            X
          </button>
        </div>
      )}
    </aside>
  );
}
