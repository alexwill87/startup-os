"use client";

/**
 * V1 Roles page — Cockpit Design System v3.0
 *
 * Behavior preserved from V2 (app/(app)/equipe/roles/page.js):
 *  - 4 role definitions with permissions and member count
 *  - Live member assignment per role from useMembers()
 *  - Organization chart linking roles + agents to areas
 *  - Read-only page (no DB writes)
 */

import Link from "next/link";
import { useMembers } from "@/lib/AuthProvider";
import { PageLayout, Topbar, PageTitle, KpiRow, KpiCard, Badge, Footer } from "@/app/components/ui";

const ROLE_DEFS = [
  {
    id: "admin",
    label: "Admin",
    variant: "danger",
    description: "Full control over the cockpit. Manages settings, API keys, bot, and member access.",
    can: [
      "Everything cofounders can do",
      "Manage API keys and bot config",
      "Invite / revoke members",
      "Modify workflow template",
      "Access all settings",
    ],
  },
  {
    id: "cofounder",
    label: "Co-founder",
    variant: "info",
    description: "Core team. Proposes, votes, and builds. Full visibility on all pillars.",
    can: [
      "Create and edit projects, features, tasks",
      "Vote on features (2/3 to validate)",
      "Approve / reject projects",
      "Manage their profile and tasks",
      "View all data",
    ],
  },
  {
    id: "mentor",
    label: "Mentor",
    variant: "success",
    description: "Read-only access with ability to comment, vote, and advise.",
    can: [
      "View all pillars (read-only)",
      "Comment on projects and vision",
      "Vote agree / disagree on decisions",
      "Validate objectives",
      "Share expertise",
    ],
  },
  {
    id: "observer",
    label: "Observer",
    variant: "neutral",
    description: "Limited view. Sees the mission, KPIs, and can give feedback.",
    can: [
      "View Vision and Projects",
      "View KPIs",
      "Submit feedback",
      "Follow project progress",
    ],
  },
];

const ORG_CHART = [
  { area: "Direction & Strategy", roles: ["admin", "cofounder"], agents: [] },
  { area: "Product & Features", roles: ["cofounder"], agents: ["Startup Assistant"] },
  { area: "Marketing & Growth", roles: ["cofounder", "mentor"], agents: [] },
  { area: "Finance & Operations", roles: ["admin", "cofounder"], agents: [] },
  { area: "Quality & Control", roles: ["mentor", "cofounder"], agents: ["Telegram Bot"] },
  { area: "Community & Support", roles: ["observer", "mentor"], agents: ["Telegram Bot"] },
];

export default function V1RolesPage() {
  const members = useMembers();

  const totalMembers = members.length;
  const adminCount = members.filter((m) => m.role === "admin").length;
  const cofounderCount = members.filter((m) => m.role === "cofounder").length;
  const mentorCount = members.filter((m) => m.role === "mentor").length;

  return (
    <PageLayout>
      <Topbar breadcrumb={["Team", "Roles"]} />
      <main style={{ flex: 1, padding: "1.5rem 1.75rem", overflowY: "auto", maxWidth: "1100px", width: "100%", margin: "0 auto" }}>
        <PageTitle
          title="Roles & Organization"
          description="Who does what in the team. 4 roles, each with its own permissions."
        />

        <KpiRow>
          <KpiCard label="Total" value={String(totalMembers)} trend="members" variant="accent" />
          <KpiCard label="Admins" value={String(adminCount)} trend="full control" variant="default" />
          <KpiCard label="Co-founders" value={String(cofounderCount)} trend="core team" variant="success" />
          <KpiCard label="Mentors" value={String(mentorCount)} trend="advisors" variant="warn" />
        </KpiRow>

        {/* Role definitions */}
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
          Role definitions
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "12px", marginBottom: "2rem" }}>
          {ROLE_DEFS.map((role) => {
            const roleMembers = members.filter((m) => m.role === role.id);
            return (
              <article
                key={role.id}
                style={{
                  background: "var(--bg-2)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  padding: "1.25rem 1.5rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)", margin: 0 }}>{role.label}</h3>
                  <Badge variant={role.variant}>
                    {roleMembers.length} {roleMembers.length === 1 ? "member" : "members"}
                  </Badge>
                </div>

                <p style={{ fontSize: "13px", color: "var(--text-2)", marginBottom: "12px", lineHeight: 1.5 }}>
                  {role.description}
                </p>

                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
                  {role.can.map((c, i) => (
                    <li
                      key={i}
                      style={{
                        fontSize: "12px",
                        color: "var(--text-3)",
                        paddingLeft: "12px",
                        position: "relative",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          left: 0,
                          color: "var(--text-3)",
                        }}
                      >
                        ·
                      </span>
                      {c}
                    </li>
                  ))}
                </ul>

                {roleMembers.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      gap: "6px",
                      flexWrap: "wrap",
                      marginTop: "12px",
                      paddingTop: "12px",
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    {roleMembers.map((m) => (
                      <Link
                        key={m.id}
                        href={`/team/members`}
                        style={{
                          fontSize: "11px",
                          padding: "3px 9px",
                          borderRadius: "20px",
                          background: "var(--bg-3)",
                          color: "var(--text-2)",
                          border: "1px solid var(--border)",
                          textDecoration: "none",
                        }}
                      >
                        {m.name || m.email}
                      </Link>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {/* Organization chart */}
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
          Organization chart
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {ORG_CHART.map((area) => {
            const assigned = [];
            area.roles.forEach((r) => {
              const ms = members.filter((m) => m.role === r);
              ms.forEach((m) => assigned.push({ kind: "member", member: m }));
            });
            area.agents.forEach((a) => assigned.push({ kind: "agent", name: a }));

            return (
              <article
                key={area.area}
                style={{
                  background: "var(--bg-2)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  padding: "1rem 1.25rem",
                }}
              >
                <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)", margin: 0, marginBottom: "10px" }}>
                  {area.area}
                </h3>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {assigned.length === 0 && (
                    <span style={{ fontSize: "11px", color: "var(--text-3)", fontStyle: "italic" }}>
                      No one assigned
                    </span>
                  )}
                  {assigned.map((a, i) => {
                    if (a.kind === "agent") {
                      return (
                        <Badge key={`agent-${i}`} variant="info">
                          Agent · {a.name}
                        </Badge>
                      );
                    }
                    const m = a.member;
                    return (
                      <Link
                        key={`m-${m.id}`}
                        href={`/team/members`}
                        style={{
                          fontSize: "11px",
                          padding: "3px 9px",
                          borderRadius: "20px",
                          background: "var(--bg-3)",
                          color: "var(--text-2)",
                          border: "1px solid var(--border)",
                          textDecoration: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span
                          style={{
                            width: "16px",
                            height: "16px",
                            borderRadius: "50%",
                            background: (m.color || "#737373") + "33",
                            color: m.color || "var(--text-2)",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "9px",
                            fontWeight: 700,
                          }}
                        >
                          {(m.name || m.email)[0].toUpperCase()}
                        </span>
                        {m.name || m.email}
                      </Link>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </main>
      <Footer />
    </PageLayout>
  );
}
