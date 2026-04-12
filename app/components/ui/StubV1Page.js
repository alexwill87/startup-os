"use client";

/**
 * StubV1Page — Cockpit Design System v3.0
 * Reusable concrete page that renders the V1_PAGES mapping content
 * for any page without a real V2 source. Used for stubs and pages
 * that haven't been built yet.
 */

import { PageLayout, Topbar, PageTitle, KpiRow, KpiCard, Badge, Footer } from "./index";
import { getV1Page } from "@/lib/v1-pages";

export default function StubV1Page({ slug, breadcrumb }) {
  const page = getV1Page(slug);
  if (!page) {
    return (
      <PageLayout>
        <Topbar breadcrumb={["V1", "Not found"]} />
        <main style={{ flex: 1, padding: "1.5rem 1.75rem" }}>
          <PageTitle title="Page not found" description={`No mapping for slug "${slug}".`} />
        </main>
        <Footer />
      </PageLayout>
    );
  }

  const crumb = breadcrumb || (page.pillar === "Home" ? ["Home"] : [page.pillar, page.title]);

  return (
    <PageLayout>
      <Topbar breadcrumb={crumb} />
      <main style={{ flex: 1, padding: "1.5rem 1.75rem", overflowY: "auto", maxWidth: "1100px", width: "100%", margin: "0 auto" }}>
        <PageTitle title={page.title} description={page.description} />

        {page.kpis && page.kpis.length > 0 && (
          <KpiRow>
            {page.kpis.map((kpi, i) => (
              <KpiCard key={i} label={kpi.label} value={kpi.value} trend={kpi.trend} variant={kpi.variant} />
            ))}
          </KpiRow>
        )}

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

        <div
          style={{
            marginTop: "1.5rem",
            padding: "0.75rem 1rem",
            background: "var(--accent-bg)",
            border: "1px solid var(--accent)",
            borderRadius: "var(--radius)",
            fontSize: "12px",
            color: "var(--accent-text)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <Badge variant="info">V1 stub</Badge>
          <span>This page is part of the plan but not yet fully implemented.</span>
        </div>
      </main>
      <Footer />
    </PageLayout>
  );
}
