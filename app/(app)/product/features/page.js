"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import {
  PageLayout, Topbar, PageTitle, KpiRow, KpiCard, Button, Badge, Footer,
} from "@/app/components/ui";

function getProgress(f) {
  return [f.step_1_done, f.step_2_done, f.step_3_done, f.step_4_done, f.step_5_done].filter(Boolean).length;
}

function getStatus(f) {
  const steps = [f.step_1_done, f.step_2_done, f.step_3_done, f.step_4_done, f.step_5_done];
  const done = steps.filter(Boolean).length;
  if (done === 5) return { label: "Validated", variant: "success" };
  if (steps[3]) return { label: "Verified", variant: "info" };
  if (steps[2]) return { label: "Built", variant: "warn" };
  if (steps[1]) return { label: "Defined", variant: "info" };
  if (steps[0]) return { label: "Ideated", variant: "neutral" };
  return { label: "Inbox", variant: "neutral" };
}

export default function V1FeaturesPage() {
  const { canEdit } = useAuth();
  const searchParams = useSearchParams();
  const projectFilter = searchParams.get("project");
  const [features, setFeatures] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
    const sub = supabase
      .channel("v1_features_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_features_os" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_projects" }, fetchAll)
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  async function fetchAll() {
    const [{ data: feat }, { data: proj }] = await Promise.all([
      supabase
        .from("cockpit_features_os")
        .select("*")
        .eq("work_kind", "feature")
        .neq("stage", "idea")
        .order("updated_at", { ascending: false }),
      supabase.from("cockpit_projects").select("*").eq("category", "product"),
    ]);
    setProjects(proj || []);
    const productProjectIds = new Set((proj || []).map((p) => p.id));
    const productFeatures = (feat || []).filter((f) => f.project_id && productProjectIds.has(f.project_id));
    setFeatures(productFeatures);
    setLoading(false);
  }

  const validatedCount = features.filter((f) => getProgress(f) === 5).length;
  const inProgressCount = features.filter((f) => {
    const p = getProgress(f);
    return p > 0 && p < 5;
  }).length;
  const inboxCount = features.filter((f) => getProgress(f) === 0).length;

  const filteredProjects = projectFilter ? projects.filter((p) => p.id === projectFilter) : projects;
  const byProject = filteredProjects.map((p) => ({
    project: p,
    features: features.filter((f) => f.project_id === p.id),
  }));
  const activeProjectName = projectFilter ? projects.find((p) => p.id === projectFilter)?.name : null;

  return (
    <PageLayout>
      <Topbar
        breadcrumb={["Product", "Features"]}
        actions={
          <Link href="/temp-cockpit/cockpit-feat">
            <Button variant="ghost">Manage all</Button>
          </Link>
        }
      />
      <main style={{ flex: 1, padding: "1.5rem 1.75rem", overflowY: "auto", maxWidth: "1100px", width: "100%", margin: "0 auto" }}>
        <PageTitle
          title="Features"
          description={`Workflow Ideated → Defined → Built → Verified → Validated. Grouped by project.`}
        />

        {activeProjectName && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "1rem", padding: "8px 12px", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
            <span style={{ fontSize: "12px", color: "var(--text-2)" }}>Filtered by</span>
            <Badge variant="accent">{activeProjectName}</Badge>
            <Link href="/product/features" style={{ fontSize: "11px", color: "var(--text-3)", textDecoration: "none", marginLeft: "auto" }}>
              Clear filter
            </Link>
          </div>
        )}

        <KpiRow>
          <KpiCard label="Total" value={String(features.length)} trend="features" variant="accent" />
          <KpiCard label="Validated" value={String(validatedCount)} trend="shipped" variant="success" />
          <KpiCard label="In progress" value={String(inProgressCount)} trend="building" variant="warn" />
          <KpiCard label="Inbox" value={String(inboxCount)} trend="not started" variant="muted" />
        </KpiRow>

        {loading ? (
          <p style={{ textAlign: "center", color: "var(--text-3)", padding: "2rem 0" }}>Loading...</p>
        ) : projects.length === 0 ? (
          <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "2rem", textAlign: "center" }}>
            <p style={{ color: "var(--text-3)", fontSize: "13px" }}>No Product projects yet.</p>
            <Link href="/focus/projects" style={{ color: "var(--accent-text)", fontSize: "12px", marginTop: "8px", display: "inline-block" }}>
              Go to Focus → Projects to create one
            </Link>
          </div>
        ) : features.length === 0 ? (
          <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "2rem", textAlign: "center" }}>
            <p style={{ color: "var(--text-3)", fontSize: "13px" }}>No product features yet.</p>
            <p style={{ color: "var(--text-3)", fontSize: "11px", marginTop: "8px" }}>Features will appear here when linked to a Product project.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {byProject.map(({ project, features: pf }) => {
              if (pf.length === 0) return null;
              return (
                <section key={project.id}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                    <h2 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)", margin: 0 }}>{project.name}</h2>
                    <span style={{ fontSize: "11px", color: "var(--text-3)" }}>{pf.length} features</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "10px" }}>
                    {pf.map((f) => {
                      const status = getStatus(f);
                      const progress = getProgress(f);
                      return (
                        <article
                          key={f.id}
                          style={{
                            background: "var(--bg-2)",
                            border: "1px solid var(--border)",
                            borderRadius: "var(--radius-lg)",
                            padding: "1rem 1.25rem",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <h3 style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)", margin: 0 }}>{f.name}</h3>
                              {f.description && (
                                <p style={{ fontSize: "11.5px", color: "var(--text-2)", margin: "4px 0 0", lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                                  {f.description}
                                </p>
                              )}
                              <div style={{ marginTop: "6px" }}>
                                <Badge variant={status.variant}>{status.label}</Badge>
                              </div>
                            </div>
                            <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--text)", flexShrink: 0 }}>{progress}/5</span>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </PageLayout>
  );
}
