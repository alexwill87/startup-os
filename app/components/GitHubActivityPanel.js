"use client";

/**
 * GitHubActivityPanel — live repo feed for project detail pages.
 *
 * Props:
 *   repoUrl  — full GitHub URL, e.g. "https://github.com/owner/repo"
 *
 * Renders: recent commits, active branches, and contributors.
 * Data is fetched via /api/github to keep tokens server-side.
 */

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/app/components/ui";

// ── helpers ──────────────────────────────────────────────────────────
function parseGitHubUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const parts = u.pathname.replace(/^\//, "").replace(/\.git$/, "").split("/");
    if (parts.length >= 2) return { owner: parts[0], repo: parts[1] };
  } catch { /* ignore */ }
  return null;
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ── tab button ───────────────────────────────────────────────────────
function Tab({ active, label, count, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 12px",
        borderRadius: "var(--radius)",
        border: "1px solid var(--border)",
        background: active ? "var(--bg-3)" : "transparent",
        color: active ? "var(--text)" : "var(--text-3)",
        fontSize: "12px",
        fontWeight: 500,
        cursor: "pointer",
        transition: "background 0.12s, color 0.12s",
      }}
    >
      {label} {count !== undefined && <span style={{ opacity: 0.6 }}>({count})</span>}
    </button>
  );
}

// ── main component ───────────────────────────────────────────────────
export default function GitHubActivityPanel({ repoUrl }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("commits");

  const parsed = parseGitHubUrl(repoUrl);

  const fetchData = useCallback(async () => {
    if (!parsed) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/github?owner=${parsed.owner}&repo=${parsed.repo}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [parsed?.owner, parsed?.repo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!parsed) return null;

  const repoLabel = `${parsed.owner}/${parsed.repo}`;

  return (
    <section
      style={{
        background: "var(--bg-2)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "1rem 1.25rem",
        marginTop: "1rem",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="var(--text-2)">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>GitHub Activity</span>
          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: "11px", color: "var(--accent-text)", textDecoration: "none" }}
          >
            {repoLabel}
          </a>
        </div>
        <button
          onClick={fetchData}
          style={{
            fontSize: "11px",
            color: "var(--text-3)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "2px 6px",
          }}
        >
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
        <Tab active={tab === "commits"} label="Commits" count={data?.commits?.length} onClick={() => setTab("commits")} />
        <Tab active={tab === "branches"} label="Branches" count={data?.branches?.length} onClick={() => setTab("branches")} />
        <Tab active={tab === "team"} label="Contributors" count={data?.contributors?.length} onClick={() => setTab("team")} />
      </div>

      {/* Content */}
      {loading && <p style={{ fontSize: "12px", color: "var(--text-3)", textAlign: "center", padding: "1rem 0" }}>Loading GitHub data...</p>}
      {error && <p style={{ fontSize: "12px", color: "var(--danger)", textAlign: "center", padding: "1rem 0" }}>Error: {error}</p>}

      {!loading && !error && data && (
        <div style={{ maxHeight: "320px", overflowY: "auto" }}>
          {/* Commits */}
          {tab === "commits" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {data.commits.length === 0 && (
                <p style={{ fontSize: "12px", color: "var(--text-3)", textAlign: "center", padding: "1rem 0" }}>No commits found.</p>
              )}
              {data.commits.map((c, i) => (
                <div
                  key={c.sha + i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    padding: "8px 10px",
                    background: "var(--bg-3)",
                    borderRadius: "var(--radius)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {c.avatar && (
                    <img
                      src={c.avatar}
                      alt={c.author}
                      style={{ width: "24px", height: "24px", borderRadius: "50%", flexShrink: 0, marginTop: "2px" }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text)", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}
                      >
                        {c.message}
                      </a>
                    </div>
                    <div style={{ display: "flex", gap: "8px", marginTop: "3px", fontSize: "10.5px", color: "var(--text-3)" }}>
                      <code style={{ background: "var(--bg-2)", padding: "1px 5px", borderRadius: "3px", fontSize: "10px", fontFamily: "monospace" }}>
                        {c.sha}
                      </code>
                      <span>{c.author}</span>
                      <span>{timeAgo(c.date)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Branches */}
          {tab === "branches" && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {data.branches.length === 0 && (
                <p style={{ fontSize: "12px", color: "var(--text-3)", textAlign: "center", padding: "1rem 0", width: "100%" }}>No branches found.</p>
              )}
              {data.branches.map((b) => (
                <div
                  key={b.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 12px",
                    background: "var(--bg-3)",
                    borderRadius: "var(--radius)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <Badge variant={b.name === "main" || b.name === "master" ? "success" : "info"}>{b.name}</Badge>
                  <code style={{ fontSize: "10px", color: "var(--text-3)", fontFamily: "monospace" }}>{b.sha}</code>
                </div>
              ))}
            </div>
          )}

          {/* Contributors */}
          {tab === "team" && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              {data.contributors.length === 0 && (
                <p style={{ fontSize: "12px", color: "var(--text-3)", textAlign: "center", padding: "1rem 0", width: "100%" }}>No contributors found.</p>
              )}
              {data.contributors.map((c) => (
                <a
                  key={c.login}
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 12px",
                    background: "var(--bg-3)",
                    borderRadius: "var(--radius)",
                    border: "1px solid var(--border)",
                    textDecoration: "none",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-2)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg-3)")}
                >
                  {c.avatar && (
                    <img src={c.avatar} alt={c.login} style={{ width: "28px", height: "28px", borderRadius: "50%" }} />
                  )}
                  <div>
                    <div style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text)" }}>{c.login}</div>
                    <div style={{ fontSize: "10.5px", color: "var(--text-3)" }}>{c.contributions} commits</div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
