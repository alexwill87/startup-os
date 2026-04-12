/**
 * PageTitle — Cockpit Design System v3.0
 * h1 (22px/700) + description (13px/text-3) + divider accent 2px largeur 40px.
 */
export default function PageTitle({ title, description }) {
  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <h1
        style={{
          fontSize: "22px",
          fontWeight: 700,
          letterSpacing: "-0.4px",
          color: "var(--text)",
          marginBottom: "3px",
          margin: 0,
        }}
      >
        {title}
      </h1>
      {description && (
        <p
          style={{
            fontSize: "13px",
            color: "var(--text-3)",
            marginBottom: "1rem",
            marginTop: "3px",
          }}
        >
          {description}
        </p>
      )}
      <div
        style={{
          height: "2px",
          background: "var(--accent)",
          width: "40px",
          borderRadius: "2px",
          marginTop: description ? 0 : "1rem",
        }}
      />
    </div>
  );
}
