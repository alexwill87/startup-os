/**
 * Form — Cockpit Design System v3.0
 * FormGroup wrapper · FormLabel haut · FormInput · FormHint
 * Pas d'icône dans inputs. Label toujours présent.
 */
export function FormGroup({ children, className = "" }) {
  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
      {children}
    </div>
  );
}

export function FormLabel({ htmlFor, children }) {
  return (
    <label
      htmlFor={htmlFor}
      style={{ fontSize: "12.5px", fontWeight: 500, color: "var(--text)" }}
    >
      {children}
    </label>
  );
}

const inputBase = {
  padding: "8px 12px",
  background: "var(--bg-2)",
  border: "1px solid var(--border-strong)",
  borderRadius: "var(--radius)",
  fontSize: "14px",
  fontFamily: "inherit",
  color: "var(--text)",
  outline: "none",
  transition: "border-color 0.12s, box-shadow 0.12s",
  width: "100%",
};

export function FormInput({ type = "text", ...rest }) {
  return (
    <input
      type={type}
      style={inputBase}
      onFocus={(e) => {
        e.target.style.borderColor = "var(--accent)";
        e.target.style.boxShadow = "0 0 0 2px var(--accent-bg)";
      }}
      onBlur={(e) => {
        e.target.style.borderColor = "var(--border-strong)";
        e.target.style.boxShadow = "none";
      }}
      {...rest}
    />
  );
}

export function FormTextarea({ rows = 3, ...rest }) {
  return (
    <textarea
      rows={rows}
      style={{ ...inputBase, resize: "vertical", fontFamily: "inherit" }}
      onFocus={(e) => {
        e.target.style.borderColor = "var(--accent)";
        e.target.style.boxShadow = "0 0 0 2px var(--accent-bg)";
      }}
      onBlur={(e) => {
        e.target.style.borderColor = "var(--border-strong)";
        e.target.style.boxShadow = "none";
      }}
      {...rest}
    />
  );
}

export function FormSelect({ children, ...rest }) {
  return (
    <select style={{ ...inputBase, cursor: "pointer" }} {...rest}>
      {children}
    </select>
  );
}

export function FormHint({ children }) {
  return (
    <span style={{ fontSize: "12px", color: "var(--text-3)" }}>{children}</span>
  );
}
