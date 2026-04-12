"use client";

/**
 * Button — Cockpit Design System v3.0
 * Variants: primary | accent | secondary | ghost | danger
 * Texte seul. JAMAIS d'icône, jamais de "+".
 */
export default function Button({
  variant = "primary",
  type = "button",
  disabled = false,
  onClick,
  children,
  className = "",
  ...rest
}) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "7px 14px",
    borderRadius: "var(--radius)",
    fontSize: "13.5px",
    fontWeight: 500,
    cursor: disabled ? "not-allowed" : "pointer",
    border: "none",
    fontFamily: "inherit",
    transition: "background 0.12s, opacity 0.12s",
    whiteSpace: "nowrap",
    opacity: disabled ? 0.5 : 1,
  };

  const variants = {
    primary: { background: "var(--text)", color: "var(--bg)" },
    accent: { background: "var(--accent)", color: "#fff" },
    secondary: {
      background: "var(--bg-3)",
      color: "var(--text)",
      border: "1px solid var(--border-strong)",
    },
    ghost: {
      background: "transparent",
      color: "var(--text-2)",
      border: "1px solid var(--border)",
    },
    danger: {
      background: "var(--danger-bg)",
      color: "var(--danger)",
      border: "1px solid rgba(239,68,68,0.3)",
    },
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={className}
      style={{ ...base, ...variants[variant] }}
      {...rest}
    >
      {children}
    </button>
  );
}
