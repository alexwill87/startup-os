"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/lib/supabase";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/board", label: "Board" },
  { href: "/vision", label: "Vision" },
  { href: "/decisions", label: "Decisions" },
  { href: "/kpis", label: "KPIs" },
  { href: "/resources", label: "Resources" },
  { href: "/docs", label: "Docs" },
  { href: "/retro", label: "Retro" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { builder } = useAuth();

  return (
    <nav className="navbar">
      <span className="logo">Startup OS</span>

      <div className="nav-links">
        {NAV_ITEMS.map(({ href, label }) => {
          const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link key={href} href={href} className={`nav-link ${isActive ? "active" : ""}`}>
              {label}
              {isActive && <span className="nav-indicator" />}
            </Link>
          );
        })}
      </div>

      <div className="navbar-user">
        {builder && (
          <span className="builder-badge" style={{ borderColor: builder.color, color: builder.color }}>
            {builder.name} ({builder.role})
          </span>
        )}
        <button className="logout-btn" onClick={() => supabase.auth.signOut()}>
          Logout
        </button>
      </div>

      <style jsx>{`
        .navbar {
          display: flex;
          align-items: center;
          gap: 24px;
          padding: 0 28px;
          height: 52px;
          background: #0d1117;
          border-bottom: 1px solid #1e293b;
          font-family: var(--font-geist-sans);
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .logo {
          font-size: 15px;
          font-weight: 800;
          color: #f1f5f9;
          letter-spacing: -0.3px;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .nav-links {
          display: flex;
          gap: 2px;
          flex: 1;
          overflow-x: auto;
          scrollbar-width: none;
          height: 100%;
          align-items: stretch;
        }
        .nav-links::-webkit-scrollbar {
          display: none;
        }

        .nav-link {
          display: flex;
          align-items: center;
          padding: 0 14px;
          font-size: 13px;
          color: #64748b;
          text-decoration: none;
          transition: all 0.15s ease;
          white-space: nowrap;
          position: relative;
          height: 100%;
        }

        .nav-link:hover {
          color: #e2e8f0;
        }

        .nav-link.active {
          color: #f1f5f9;
          font-weight: 600;
        }

        .nav-indicator {
          position: absolute;
          bottom: 0;
          left: 8px;
          right: 8px;
          height: 2px;
          background: #3b82f6;
          border-radius: 2px 2px 0 0;
        }

        .navbar-user {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .builder-badge {
          font-size: 11px;
          border: 1px solid;
          border-radius: 20px;
          padding: 3px 12px;
          font-family: var(--font-geist-mono);
          font-weight: 600;
        }

        .logout-btn {
          font-size: 11px;
          color: #475569;
          background: none;
          border: 1px solid #1e293b;
          border-radius: 6px;
          padding: 3px 10px;
          cursor: pointer;
          font-family: var(--font-geist-mono);
          transition: all 0.15s;
        }
        .logout-btn:hover {
          color: #ef4444;
          border-color: #ef4444;
        }
      `}</style>
    </nav>
  );
}
