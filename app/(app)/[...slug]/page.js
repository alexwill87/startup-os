import { notFound } from "next/navigation";
import {
  PageLayout,
  Topbar,
  PageTitle,
  KpiRow,
  KpiCard,
  Footer,
  Badge,
  Button,
} from "@/app/components/ui";
import { getV1Page } from "@/lib/v1-pages";

/**
 * V1 catch-all page — Cockpit Design System v3.0
 *
 * Affiche n'importe quelle page V1 à partir de son slug.
 * Source du contenu : lib/v1-pages.js (V1_PAGES mapping).
 *
 * Pour migrer une page individuelle vers une vraie implémentation :
 * créer app/v1/<chemin>/page.js qui prend le pas sur cette catch-all.
 */
export default async function V1CatchAllPage({ params }) {
  const { slug } = await params;
  const slugStr = Array.isArray(slug) ? slug.join("/") : slug || "";
  const page = getV1Page(slugStr);

  if (!page) {
    return (
      <PageLayout>
        <Topbar breadcrumb={["V1", "Not found"]} />
        <main style={{ flex: 1, padding: "1.5rem 1.75rem" }}>
          <PageTitle
            title="Page not found"
            description={`No entry in v1-pages.js for slug "${slugStr}".`}
          />
          <div
            style={{
              padding: "1rem",
              background: "var(--bg-2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              fontSize: "13px",
              color: "var(--text-2)",
            }}
          >
            To add this page, edit{" "}
            <code style={{ background: "var(--bg-3)", padding: "1px 6px", borderRadius: "3px" }}>
              lib/v1-pages.js
            </code>{" "}
            and add an entry to the V1_PAGES mapping.
          </div>
        </main>
        <Footer />
      </PageLayout>
    );
  }

  const breadcrumb = page.pillar === "Home" ? ["Home"] : [page.pillar, page.title];

  return (
    <PageLayout>
      <Topbar
        breadcrumb={breadcrumb}
        actions={
          <>
            <Button variant="ghost">Filter</Button>
            <Button variant="primary">Primary action</Button>
          </>
        }
      />
      <main style={{ flex: 1, padding: "1.5rem 1.75rem", overflowY: "auto" }}>
        <PageTitle title={page.title} description={page.description} />

        {page.kpis && page.kpis.length > 0 && (
          <KpiRow>
            {page.kpis.map((kpi, i) => (
              <KpiCard
                key={i}
                label={kpi.label}
                value={kpi.value}
                trend={kpi.trend}
                variant={kpi.variant}
              />
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
            border: "1px solid rgba(59,130,246,0.25)",
            borderRadius: "var(--radius)",
            fontSize: "12px",
            color: "var(--accent-text)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <Badge variant="info">V1</Badge>
          <span>
            Blank V1 page — design charter showcase. Real content is in the V2 version
            (route without /v1).
          </span>
        </div>
      </main>
      <Footer />
    </PageLayout>
  );
}

// Generate static params for any V1 mapping entry not covered by an explicit page.
// The empty slug "" (Home) is excluded since `/v1/page.js` handles it.
export async function generateStaticParams() {
  const { V1_PAGES } = await import("@/lib/v1-pages");
  return Object.keys(V1_PAGES)
    .filter((slug) => slug !== "")
    .map((slug) => ({ slug: slug.split("/") }));
}
