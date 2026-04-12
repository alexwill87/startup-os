"use client";

import {
  PageLayout, Topbar, PageTitle, KpiRow, KpiCard, Badge, Footer,
} from "@/app/components/ui";

const FEATURE_STEPS = [
  { name: "Ideated", description: "Initial idea captured" },
  { name: "Defined", description: "Specs, criteria, prerequisites documented" },
  { name: "Built", description: "Implementation complete" },
  { name: "Verified", description: "Tested and reviewed" },
  { name: "Validated", description: "Team vote passed, shipped" },
];

const TASK_STEPS = [
  { name: "Todo", description: "Not started" },
  { name: "Doing", description: "Work in progress" },
  { name: "Done", description: "Completed" },
];

export default function WorkflowSettingsPage() {
  return (
    <PageLayout>
      <Topbar breadcrumb={["Settings", "Workflow"]} />
      <main style={{ flex: 1, padding: "1.5rem 1.75rem", overflowY: "auto", maxWidth: "1100px", width: "100%", margin: "0 auto" }}>
        <PageTitle title="Workflow" description="The 2 workflows: Feature (5 steps, vote required) and Task (3 steps, individual)." />
        <KpiRow>
          <KpiCard label="Feature steps" value="5" variant="accent" />
          <KpiCard label="Task steps" value="3" variant="default" />
          <KpiCard label="Vote required" value="2/3" trend="to validate" variant="warn" />
        </KpiRow>

        <section style={cs}>
          <h3 style={st}>Feature Workflow</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {FEATURE_STEPS.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
                <span style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-3)", width: "30px", textAlign: "center" }}>{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>{s.name}</span>
                  <p style={{ fontSize: "11px", color: "var(--text-3)", margin: "2px 0 0" }}>{s.description}</p>
                </div>
                <Badge variant={i === 4 ? "success" : i === 0 ? "neutral" : "info"}>Step {i + 1}</Badge>
              </div>
            ))}
          </div>
        </section>

        <section style={{ ...cs, marginTop: "16px" }}>
          <h3 style={st}>Task Workflow</h3>
          <div style={{ display: "flex", gap: "12px" }}>
            {TASK_STEPS.map((s, i) => (
              <div key={i} style={{ flex: 1, padding: "16px", background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", textAlign: "center" }}>
                <span style={{ fontSize: "18px", fontWeight: 700, color: "var(--text)" }}>{s.name}</span>
                <p style={{ fontSize: "11px", color: "var(--text-3)", margin: "4px 0 0" }}>{s.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </PageLayout>
  );
}

const cs = { background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.25rem 1.5rem" };
const st = { fontSize: "14px", fontWeight: 600, color: "var(--text)", margin: "0 0 12px" };
