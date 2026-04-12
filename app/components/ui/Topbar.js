/**
 * Topbar — Cockpit Design System v3.0
 * Hauteur 52px. Breadcrumb (texte pur) + actions à droite.
 * Aucune icône, jamais.
 */
export default function Topbar({ breadcrumb = [], actions = null }) {
  return (
    <div
      style={{
        height: "var(--topbar-h)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 1.5rem",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg)",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          fontSize: "13px",
          color: "var(--text-3)",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        {breadcrumb.map((label, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                color: i === breadcrumb.length - 1 ? "var(--text)" : "var(--text-2)",
                fontWeight: i === breadcrumb.length - 1 ? 500 : 400,
              }}
            >
              {label}
            </span>
            {i < breadcrumb.length - 1 && (
              <span style={{ color: "var(--border-strong)", fontSize: "16px", lineHeight: 1 }}>
                /
              </span>
            )}
          </span>
        ))}
      </div>
      {actions && <div style={{ display: "flex", gap: "8px" }}>{actions}</div>}
    </div>
  );
}
