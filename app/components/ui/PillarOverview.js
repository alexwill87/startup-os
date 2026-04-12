"use client";

/**
 * PillarOverview — Cockpit Design System v3.0
 * Generic root page for any pillar (Focus, Product, Market, etc.).
 * Lists sub-pages with their description and provides a quick KPI row.
 *
 * Usage:
 *   <PillarOverview pillarId="focus" />
 */

import Link from "next/link";
import { PageLayout, Topbar, PageTitle, KpiRow, KpiCard, Badge, Footer } from "./index";
import { getV1Page, V1_PILLARS } from "@/lib/v1-pages";

export default function PillarOverview({ pillarId }) {
  const pillar = V1_PILLARS.find((p) => p.id === pillarId);
  const page = getV1Page(pillar?.root || pillarId);

  if (!pillar || !page) {
    return (
      <PageLayout>
        <Topbar breadcrumb={["V1", "Not found"]} />
        <main style={{ flex: 1, padding: "1.5rem 1.75rem" }}>
          <PageTitle title="Pillar not found" />
        </main>
        <Footer />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Topbar breadcrumb={[pillar.label]} />
      <main style={{ flex: 1, padding: "1.5rem 1.75rem", overflowY: "auto", maxWidth: "1100px", width: "100%", margin: "0 auto" }}>
        <PageTitle title={page.title} description={page.description} />

        {page.kpis && page.kpis.length > 0 && (
          <KpiRow>
            {page.kpis.map((kpi, i) => (
              <KpiCard key={i} label={kpi.label} value={kpi.value} trend={kpi.trend} variant={kpi.variant} />
            ))}
          </KpiRow>
        )}

        <h2
          style={{
            fontSize: "11px",
            fontWeight: 600,
            color: "var(--text-3)",
            textTransform: "uppercase",
            letterSpacing: "0.6px",
            marginBottom: "12px",
          }}
        >
          Sub-pages ({pillar.items.length})
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px", marginBottom: "1.5rem" }}>
          {pillar.items.map((item) => {
            const sub = getV1Page(item.slug);
            return (
              <Link
                key={item.slug}
                href={`/${item.slug}`}
                style={{
                  display: "block",
                  padding: "1rem 1.25rem",
                  background: "var(--bg-2)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  textDecoration: "none",
                  transition: "background 0.12s, border-color 0.12s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--bg-3)";
                  e.currentTarget.style.borderColor = "var(--border-strong)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--bg-2)";
                  e.currentTarget.style.borderColor = "var(--border)";
                }}
              >
                <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--text)", margin: 0, marginBottom: "6px" }}>
                  {item.label}
                </h3>
                {sub?.description && (
                  <p style={{ fontSize: "12.5px", color: "var(--text-3)", margin: 0, lineHeight: 1.5 }}>
                    {sub.description}
                  </p>
                )}
              </Link>
            );
          })}
        </div>

        <div
          style={{
            padding: "1.25rem 1.5rem",
            background: "var(--bg-2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            fontSize: "14px",
            lineHeight: 1.65,
            color: "var(--text-2)",
            whiteSpace: "pre-wrap",
          }}
        >
          {page.content}
        </div>
      </main>
      <Footer />
    </PageLayout>
  );
}
