"use client";

/**
 * V1 Home — Cockpit Design System v3.0
 *
 * Combines Global view (team-wide snapshot) and Personal view (your work).
 * Live data from Supabase.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth, useMembers, useProject } from "@/lib/AuthProvider";
import {
  PageLayout, Topbar, PageTitle, KpiRow, KpiCard, Badge, Footer,
} from "@/app/components/ui";

export default function V1HomePage() {
  const { user, member } = useAuth();
  const members = useMembers();
  const project = useProject();
  const [projects, setProjects] = useState([]);
  const [features, setFeatures] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [sprint, setSprint] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
    const sub = supabase
      .channel("v1_home_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_projects" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_features_os" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_sprints" }, fetchAll)
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  async function fetchAll() {
    const [{ data: proj }, { data: feat }, { data: spr }] = await Promise.all([
      supabase.from("cockpit_projects").select("*"),
      supabase.from("cockpit_features_os").select("*"),
      supabase.from("cockpit_sprints").select("*").order("created_at", { ascending: false }),
    ]);
    setProjects(proj || []);
    setFeatures((feat || []).filter((f) => f.work_kind === "feature" && f.stage !== "idea"));
    setTasks((feat || []).filter((f) => f.work_kind === "mission"));
    setSprint((spr || []).find((s) => s.status === "active"));
    setLoading(false);
  }

  // Global stats
  const activeProjects = projects.filter((p) => p.status === "active" || p.status === "locked").length;
  const activeFeatures = features.filter((f) => {
    const done = [f.step_1_done, f.step_2_done, f.step_3_done, f.step_4_done, f.step_5_done].filter(Boolean).length;
    return done > 0 && done < 5;
  }).length;
  const activeTasks = tasks.filter((t) => !t.step_3_done).length;
  const memberCount = members.filter((m) => m.status === "active").length;

  // Personal stats
  const myFeatures = features.filter((f) => f.owner === member?.name);
  const myTasks = tasks.filter((t) => t.owner === member?.name && !t.step_3_done);
  const myValidated = myFeatures.filter((f) => {
    const done = [f.step_1_done, f.step_2_done, f.step_3_done, f.step_4_done, f.step_5_done].filter(Boolean).length;
    return done === 5;
  }).length;

  const sectionStyle = {
    background: "var(--bg-2)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    padding: "1.25rem 1.5rem",
  };

  const sectionTitle = {
    fontSize: "11px",
    fontWeight: 600,
    color: "var(--text-3)",
    textTransform: "uppercase",
    letterSpacing: "0.6px",
    marginBottom: "10px",
  };

  return (
    <PageLayout>
      <Topbar breadcrumb={["Home"]} />
      <main style={{ flex: 1, padding: "1.5rem 1.75rem", overflowY: "auto", maxWidth: "1200px", width: "100%", margin: "0 auto" }}>
        <PageTitle
          title={`Welcome${member?.name ? ", " + member.name : ""}`}
          description={project?.name ? `Live snapshot of ${project.name}` : "Live project snapshot"}
        />

        {/* Global KPIs */}
        <h2 style={sectionTitle}>Global view</h2>
        <KpiRow>
          <KpiCard label="Active projects" value={String(activeProjects)} trend={`of ${projects.length}`} variant="accent" />
          <KpiCard label="Active features" value={String(activeFeatures)} trend="building" variant="warn" />
          <KpiCard label="Open tasks" value={String(activeTasks)} trend="todo + doing" variant="default" />
          <KpiCard label="Members" value={String(memberCount)} trend="active" variant="success" />
        </KpiRow>

        {/* Active sprint */}
        {sprint && (
          <section style={{ ...sectionStyle, borderLeft: "3px solid var(--success)", marginBottom: "1.5rem" }}>
            <Badge variant="success">Active sprint</Badge>
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)", margin: "8px 0 4px" }}>{sprint.name}</h3>
            {sprint.description && <p style={{ fontSize: "12.5px", color: "var(--text-2)", margin: 0 }}>{sprint.description}</p>}
            {sprint.end_date && (
              <p style={{ fontSize: "11px", color: "var(--text-3)", marginTop: "8px" }}>
                Deadline: {sprint.end_date}
              </p>
            )}
            <Link
              href="/focus/sprints"
              style={{ fontSize: "11px", color: "var(--accent-text)", textDecoration: "none", marginTop: "8px", display: "inline-block" }}
            >
              View all sprints →
            </Link>
          </section>
        )}

        {/* 4 columns: Recent projects, Active features, Members, Last activity */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "1.5rem" }}>
          {/* Recent projects */}
          <section style={sectionStyle}>
            <h3 style={sectionTitle}>Recent projects</h3>
            {projects.slice(0, 5).map((p) => (
              <Link
                key={p.id}
                href="/focus/projects"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "6px 0",
                  borderBottom: "1px solid var(--border)",
                  textDecoration: "none",
                  color: "var(--text-2)",
                  fontSize: "12.5px",
                }}
              >
                <span>{p.name}</span>
                <Badge variant={p.status === "active" ? "success" : p.status === "locked" ? "warn" : "neutral"}>
                  {p.status}
                </Badge>
              </Link>
            ))}
            {projects.length === 0 && <p style={{ fontSize: "12px", color: "var(--text-3)" }}>No projects yet.</p>}
          </section>

          {/* Active features */}
          <section style={sectionStyle}>
            <h3 style={sectionTitle}>Features in progress</h3>
            {features
              .filter((f) => {
                const done = [f.step_1_done, f.step_2_done, f.step_3_done, f.step_4_done, f.step_5_done].filter(Boolean).length;
                return done > 0 && done < 5;
              })
              .slice(0, 5)
              .map((f) => {
                const done = [f.step_1_done, f.step_2_done, f.step_3_done, f.step_4_done, f.step_5_done].filter(Boolean).length;
                return (
                  <Link
                    key={f.id}
                    href="/product/features"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 0",
                      borderBottom: "1px solid var(--border)",
                      textDecoration: "none",
                      color: "var(--text-2)",
                      fontSize: "12.5px",
                    }}
                  >
                    <span>{f.name}</span>
                    <span style={{ color: "var(--text-3)" }}>{done}/5</span>
                  </Link>
                );
              })}
            {features.filter((f) => {
              const done = [f.step_1_done, f.step_2_done, f.step_3_done, f.step_4_done, f.step_5_done].filter(Boolean).length;
              return done > 0 && done < 5;
            }).length === 0 && <p style={{ fontSize: "12px", color: "var(--text-3)" }}>No features in progress.</p>}
          </section>
        </div>

        {/* Personal section */}
        <h2 style={sectionTitle}>Personal view</h2>
        <KpiRow>
          <KpiCard label="My features" value={String(myFeatures.length)} trend="owned" variant="accent" />
          <KpiCard label="Validated" value={String(myValidated)} trend="shipped by me" variant="success" />
          <KpiCard label="My tasks" value={String(myTasks.length)} trend="open" variant="warn" />
        </KpiRow>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <section style={sectionStyle}>
            <h3 style={sectionTitle}>My features</h3>
            {myFeatures.slice(0, 5).map((f) => {
              const done = [f.step_1_done, f.step_2_done, f.step_3_done, f.step_4_done, f.step_5_done].filter(Boolean).length;
              return (
                <Link
                  key={f.id}
                  href="/product/features"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 0",
                    borderBottom: "1px solid var(--border)",
                    textDecoration: "none",
                    color: "var(--text-2)",
                    fontSize: "12.5px",
                  }}
                >
                  <span>{f.name}</span>
                  <span style={{ color: done === 5 ? "var(--success)" : "var(--text-3)" }}>{done}/5</span>
                </Link>
              );
            })}
            {myFeatures.length === 0 && <p style={{ fontSize: "12px", color: "var(--text-3)" }}>You don't own any feature yet.</p>}
          </section>

          <section style={sectionStyle}>
            <h3 style={sectionTitle}>My tasks</h3>
            {myTasks.slice(0, 5).map((t) => (
              <Link
                key={t.id}
                href="/focus/tasks"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "6px 0",
                  borderBottom: "1px solid var(--border)",
                  textDecoration: "none",
                  color: "var(--text-2)",
                  fontSize: "12.5px",
                }}
              >
                <span>{t.name}</span>
                <Badge variant={t.step_1_done ? "warn" : "neutral"}>{t.step_1_done ? "Doing" : "Todo"}</Badge>
              </Link>
            ))}
            {myTasks.length === 0 && <p style={{ fontSize: "12px", color: "var(--text-3)" }}>No open tasks.</p>}
          </section>
        </div>

        {loading && <p style={{ textAlign: "center", color: "var(--text-3)", marginTop: "1rem" }}>Loading live data...</p>}
      </main>
      <Footer />
    </PageLayout>
  );
}
