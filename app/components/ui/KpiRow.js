/**
 * KpiRow + KpiCard — Cockpit Design System v3.0
 * Grid auto-fit min 110px. Variants couleur du chiffre : accent | success | warn | muted | default
 */
export function KpiRow({ children, className = "" }) {
  return (
    <div
      className={className}
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
        gap: "8px",
        marginBottom: "1.25rem",
      }}
    >
      {children}
    </div>
  );
}

const VALUE_COLORS = {
  accent: "var(--accent)",
  success: "var(--success)",
  warn: "var(--warn)",
  muted: "var(--text-3)",
  default: "var(--text)",
};

export function KpiCard({ label, value, trend, variant = "default" }) {
  return (
    <div
      style={{
        background: "var(--bg-2)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "10px 12px",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          color: "var(--text-3)",
          fontWeight: 500,
          marginBottom: "5px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "24px",
          fontWeight: 700,
          letterSpacing: "-0.5px",
          lineHeight: 1,
          color: VALUE_COLORS[variant] || VALUE_COLORS.default,
        }}
      >
        {value}
      </div>
      {trend && (
        <div style={{ fontSize: "11px", color: "var(--text-3)", marginTop: "3px" }}>{trend}</div>
      )}
    </div>
  );
}
