"use client";

import { useState } from "react";
import { useAuth } from "@/lib/AuthProvider";
import Link from "next/link";
import {
  PageLayout, Topbar, PageTitle, KpiRow, KpiCard, Badge, Footer,
} from "@/app/components/ui";

const STEPS = {
  admin: [
    { label: "Configure project identity", href: "/settings/project", description: "Set name, logo, description" },
    { label: "Set up Telegram bot", href: "/settings/bot", description: "Token + admin chat ID" },
    { label: "Add API keys for Steve", href: "/agent/keys", description: "OpenRouter, OpenAI, Mistral" },
    { label: "Invite team members", href: "/team/members", description: "Cofounders, mentors, observers" },
    { label: "Define the Vision", href: "/focus/vision", description: "Mission, problem, North Star" },
    { label: "Create the first project", href: "/focus/projects", description: "Why, How, What" },
    { label: "Propose Sprint 1", href: "/focus/sprints", description: "Weekly rhythm starts" },
    { label: "Configure Steve's personality", href: "/agent/config", description: "Identity, Soul, Rules, Tools" },
  ],
  cofounder: [
    { label: "Complete your profile", href: "/me/profile", description: "Name, bio, skills, Telegram ID" },
    { label: "Read the Vision", href: "/focus/vision", description: "Understand the mission" },
    { label: "Vote on open projects", href: "/focus/projects", description: "Approve with 2/3 majority" },
    { label: "Submit your first idea", href: "/product/ideas", description: "What should we build?" },
    { label: "Pick up a task", href: "/focus/tasks", description: "Start contributing" },
    { label: "Explore KPIs", href: "/business/kpis", description: "What we're measuring" },
  ],
  mentor: [
    { label: "Complete your profile", href: "/me/profile", description: "Name, bio, expertise" },
    { label: "Read the Vision", href: "/focus/vision", description: "Comment and vote" },
    { label: "Review open projects", href: "/focus/projects", description: "Give your opinion" },
    { label: "Check the team", href: "/team/members", description: "Know who you're advising" },
    { label: "Submit feedback", href: "/product/feedback", description: "Share insights" },
  ],
  observer: [
    { label: "Read the Vision", href: "/focus/vision", description: "Understand the project" },
    { label: "Check KPIs", href: "/business/kpis", description: "Follow progress" },
    { label: "Submit feedback", href: "/product/feedback", description: "Share your thoughts" },
  ],
};

export default function OnboardingPage() {
  const { member } = useAuth();
  const role = member?.role || "observer";
  const steps = STEPS[role] || STEPS.observer;
  const [done, setDone] = useState(new Set());

  function toggle(i) {
    const next = new Set(done);
    if (next.has(i)) next.delete(i); else next.add(i);
    setDone(next);
  }

  const pct = steps.length > 0 ? Math.round((done.size / steps.length) * 100) : 0;

  return (
    <PageLayout>
      <Topbar breadcrumb={["Me", "Onboarding"]} />
      <main style={{ flex: 1, padding: "1.5rem 1.75rem", overflowY: "auto", maxWidth: "900px", width: "100%", margin: "0 auto" }}>
        <PageTitle title="Onboarding" description={`Your personalized checklist as ${role}. ${steps.length} steps to get started.`} />

        <KpiRow>
          <KpiCard label="Progress" value={`${pct}%`} variant={pct === 100 ? "success" : pct > 50 ? "warn" : "accent"} />
          <KpiCard label="Done" value={`${done.size}/${steps.length}`} variant="default" />
          <KpiCard label="Role" value={role} variant="info" />
        </KpiRow>

        {/* Progress bar */}
        <div style={{ height: "6px", background: "var(--bg-3)", borderRadius: "3px", overflow: "hidden", marginBottom: "1.5rem" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "var(--success)" : "var(--accent)", transition: "width 0.3s" }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {steps.map((step, i) => {
            const checked = done.has(i);
            return (
              <div
                key={i}
                onClick={() => toggle(i)}
                style={{
                  display: "flex", alignItems: "center", gap: "14px", padding: "14px 16px",
                  background: checked ? "var(--success-bg)" : "var(--bg-2)",
                  border: `1px solid ${checked ? "var(--success)" : "var(--border)"}`,
                  borderRadius: "var(--radius-lg)", cursor: "pointer", transition: "background 0.12s",
                }}
              >
                <span style={{
                  width: "22px", height: "22px", borderRadius: "50%", flexShrink: 0,
                  border: `2px solid ${checked ? "var(--success)" : "var(--border-strong)"}`,
                  background: checked ? "var(--success)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "12px", color: "var(--bg)", fontWeight: 700,
                }}>{checked ? "✓" : ""}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: "13px", fontWeight: 500, color: checked ? "var(--success-text)" : "var(--text)", textDecoration: checked ? "line-through" : "none" }}>{step.label}</span>
                  <p style={{ fontSize: "11px", color: "var(--text-3)", margin: "2px 0 0" }}>{step.description}</p>
                </div>
                <Link href={step.href} onClick={(e) => e.stopPropagation()} style={{ fontSize: "11px", color: "var(--accent-text)", textDecoration: "none" }}>Go →</Link>
              </div>
            );
          })}
        </div>
      </main>
      <Footer />
    </PageLayout>
  );
}
