"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/lib/supabase";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "D" },
  { href: "/board", label: "Board", icon: "B" },
  { href: "/vision", label: "Vision", icon: "V" },
  { href: "/decisions", label: "Decisions", icon: "?" },
  { href: "/kpis", label: "KPIs", icon: "#" },
  { href: "/resources", label: "Resources", icon: "R" },
  { href: "/docs", label: "Docs", icon: "A" },
  { href: "/retro", label: "Retro", icon: ">" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { builder } = useAuth();

  return (
    <nav className="navbar">
      {/* Top bar: logo + user */}
      <div className="navbar-top">
        <span className="logo">Radar Cockpit</span>
        <div className="navbar-user">
          {builder && (
            <span className="builder-badge" style={{ borderColor: builder.color, color: builder.color }}>
              {builder.name} — Builder {builder.role}
            </span>
          )}
          <button className="logout-btn" onClick={() => supabase.auth.signOut()}>
            Logout
          </button>
        </div>
      </div>

      {/* Nav links row */}
      <div className="nav-links">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link key={href} href={href} className={`nav-link ${isActive ? "active" : ""}`}>
              <span className="nav-icon">{icon}</span>
              <span className="nav-label">{label}</span>
              {isActive && <span className="nav-indicator" />}
            </Link>
          );
        })}
      </div>

      <style jsx>{`
        .navbar {
          background: #0d1117;
          border-bottom: 1px solid #1e293b;
          font-family: var(--font-geist-sans);
          padding: 0;
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .navbar-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 28px 0;
        }

        .logo {
          font-size: 18px;
          font-weight: 800;
          color: #f1f5f9;
          letter-spacing: -0.3px;
        }

        .navbar-user {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .builder-badge {
          font-size: 12px;
          border: 1px solid;
          border-radius: 20px;
          padding: 4px 14px;
          font-family: var(--font-geist-mono);
          font-weight: 600;
        }

        .logout-btn {
          font-size: 11px;
          color: #475569;
          background: none;
          border: 1px solid #1e293b;
          border-radius: 6px;
          padding: 4px 12px;
          cursor: pointer;
          font-family: var(--font-geist-mono);
          transition: all 0.15s;
        }
        .logout-btn:hover {
          color: #ef4444;
          border-color: #ef4444;
        }

        .nav-links {
          display: flex;
          gap: 2px;
          padding: 12px 28px 0;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .nav-links::-webkit-scrollbar {
          display: none;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          border-radius: 8px 8px 0 0;
          font-size: 13px;
          color: #64748b;
          text-decoration: none;
          transition: all 0.2s ease;
          white-space: nowrap;
          position: relative;
          border: 1px solid transparent;
          border-bottom: none;
        }

        .nav-link:hover {
          color: #e2e8f0;
          background: #161b22;
          border-color: #1e293b;
        }

        .nav-link.active {
          color: #f1f5f9;
          background: #080c14;
          border-color: #1e293b;
          font-weight: 600;
        }

        .nav-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 5px;
          font-size: 11px;
          font-weight: 700;
          font-family: var(--font-geist-mono);
          background: #1e293b;
          color: #64748b;
          transition: all 0.2s ease;
        }

        .nav-link:hover .nav-icon {
          background: #1e3a5f;
          color: #93c5fd;
        }

        .nav-link.active .nav-icon {
          background: #1e3a5f;
          color: #93c5fd;
        }

        .nav-label {
          transition: color 0.2s ease;
        }

        .nav-indicator {
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background: #3b82f6;
          border-radius: 2px 2px 0 0;
        }
      `}</style>
    </nav>
  );
}
