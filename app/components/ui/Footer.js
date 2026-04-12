"use client";

import { useProject } from "@/lib/AuthProvider";

/**
 * Footer — Cockpit Design System v3.0
 * Footer global "Built with Startup OS" + lien vers le repo upstream.
 * Affiché en bas de chaque page (publique et authentifiée).
 *
 * Format : {project.name} · {currentYear} · Built with Startup OS
 * Si aucun nom de projet en DB, affiche uniquement "{currentYear} · Built with Startup OS"
 */
export default function Footer() {
  const project = useProject();
  const year = new Date().getFullYear();
  const projectName = project?.name && project.name !== "Startup OS" ? project.name : null;

  return (
    <footer
      style={{
        padding: "1rem 1.5rem",
        background: "var(--bg-2)",
        borderTop: "1px solid var(--border)",
        fontSize: "12px",
        color: "var(--text-3)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "8px",
        flexWrap: "wrap",
      }}
    >
      {projectName && (
        <>
          <span>{projectName}</span>
          <span style={{ color: "var(--border-strong)" }}>·</span>
        </>
      )}
      <span>{year}</span>
      <span style={{ color: "var(--border-strong)" }}>·</span>
      <span>
        Built with{" "}
        <a
          href="https://github.com/alexwill87/startup-os"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "var(--text-2)",
            textDecoration: "none",
            borderBottom: "1px solid var(--border-strong)",
          }}
        >
          Startup OS
        </a>
      </span>
    </footer>
  );
}
