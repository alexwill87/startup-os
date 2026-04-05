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
      <div className="nav-left">
        <span className="logo">&#x1F6E1; Cockpit</span>
        <div className="nav-links">
          {NAV_ITEMS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`nav-link ${pathname === href || (href !== "/" && pathname.startsWith(href)) ? "active" : ""}`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
      <div className="nav-right">
        {builder && (
          <span className="builder-badge" style={{ borderColor: builder.color }}>
            {builder.name} (Builder {builder.role})
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
          justify-content: space-between;
          padding: 12px 24px;
          background: #0d1117;
          border-bottom: 1px solid #1e293b;
          font-family: var(--font-geist-sans);
        }
        .nav-left {
          display: flex;
          align-items: center;
          gap: 24px;
        }
        .logo {
          font-size: 16px;
          font-weight: 800;
          color: #f1f5f9;
        }
        .nav-links {
          display: flex;
          gap: 4px;
        }
        .nav-link {
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 13px;
          color: #94a3b8;
          text-decoration: none;
          transition: all 0.15s;
        }
        .nav-link:hover {
          background: #1e293b;
          color: #f1f5f9;
        }
        .nav-link.active {
          background: #1e3a5f;
          color: #93c5fd;
          font-weight: 600;
        }
        .nav-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .builder-badge {
          font-size: 12px;
          color: #94a3b8;
          border: 1px solid;
          border-radius: 6px;
          padding: 4px 10px;
          font-family: var(--font-geist-mono);
        }
        .logout-btn {
          font-size: 12px;
          color: #64748b;
          background: none;
          border: 1px solid #1e293b;
          border-radius: 6px;
          padding: 4px 10px;
          cursor: pointer;
          font-family: var(--font-geist-mono);
        }
        .logout-btn:hover {
          color: #ef4444;
          border-color: #ef4444;
        }
      `}</style>
    </nav>
  );
}
