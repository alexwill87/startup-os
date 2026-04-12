/**
 * Table — Cockpit Design System v3.0
 * Header uppercase 11px. Lignes hover bg-2. Aucune icône dans header ni cellules.
 *
 * Usage:
 *   <Table
 *     columns={[{ key: 'name', label: 'Projet' }, { key: 'status', label: 'Statut' }]}
 *     data={[{ name: 'X', status: <Badge>Actif</Badge> }]}
 *   />
 */
export default function Table({ columns = [], data = [], emptyMessage = "Aucune donnée" }) {
  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        fontSize: "13.5px",
        background: "var(--bg)",
      }}
    >
      <thead>
        <tr>
          {columns.map((col) => (
            <th
              key={col.key}
              style={{
                textAlign: "left",
                padding: "8px 12px",
                fontSize: "11px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: "var(--text-3)",
                borderBottom: "1px solid var(--border-strong)",
                background: "var(--bg-2)",
              }}
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.length === 0 && (
          <tr>
            <td
              colSpan={columns.length}
              style={{
                padding: "20px 12px",
                textAlign: "center",
                color: "var(--text-3)",
                fontSize: "13px",
              }}
            >
              {emptyMessage}
            </td>
          </tr>
        )}
        {data.map((row, i) => (
          <tr key={i} style={{ transition: "background 0.12s" }}>
            {columns.map((col) => (
              <td
                key={col.key}
                style={{
                  padding: "10px 12px",
                  borderBottom: "1px solid var(--border)",
                  color: "var(--text-2)",
                  verticalAlign: "middle",
                }}
              >
                {row[col.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
