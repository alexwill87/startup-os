/**
 * PageLayout — Cockpit Design System v3.0
 * Wrapper de page : applique le fond, le padding et la largeur max.
 * À utiliser autour de chaque page V1 (et future migration V2).
 */
export default function PageLayout({ children, className = "" }) {
  return (
    <div
      className={className}
      style={{
        background: "var(--bg)",
        color: "var(--text)",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {children}
    </div>
  );
}
