/**
 * Badge — Cockpit Design System v3.0
 * Variants: success | info | warn | danger | neutral
 * Texte pur uniquement. Jamais d'icône, jamais de point coloré.
 */
export default function Badge({ variant = "neutral", children, className = "" }) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    padding: "3px 9px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 500,
    whiteSpace: "nowrap",
  };

  const variants = {
    success: { background: "var(--success-bg)", color: "var(--success)" },
    info: { background: "var(--accent-bg)", color: "var(--accent-text)" },
    warn: { background: "var(--warn-bg)", color: "var(--warn)" },
    danger: { background: "var(--danger-bg)", color: "var(--danger)" },
    neutral: {
      background: "var(--bg-3)",
      color: "var(--text-2)",
      border: "1px solid var(--border)",
    },
  };

  return (
    <span className={className} style={{ ...base, ...variants[variant] }}>
      {children}
    </span>
  );
}
