"use client";

import {
  PageLayout, Topbar, PageTitle, Badge, Footer,
} from "@/app/components/ui";

const SECTIONS = [
  {
    title: "Getting Started",
    items: [
      "Sign in with your magic link (check your email)",
      "Complete your profile: /me/profile",
      "Explore the sidebar — 10 pillars covering every aspect of your startup",
      "Start by reading the Vision (/focus/vision) to understand the project direction",
    ],
  },
  {
    title: "How Work Gets Done",
    items: [
      "Projects live in Focus → Projects. Each has a Why/How/What.",
      "Features follow a 5-step workflow: Ideated → Defined → Built → Verified → Validated",
      "Tasks (ex-Missions) are lightweight: Todo → Doing → Done",
      "Ideas start in Product → Ideas. Vote to promote them to features.",
      "Sprints are weekly time-boxes. The team votes 2/3 to approve each sprint.",
    ],
  },
  {
    title: "Roles & Permissions",
    items: [
      "Admin — full control, settings, keys, bot, invite/revoke",
      "Cofounder — create, edit, vote on everything. Core team.",
      "Mentor — read-only + comment + vote. Advisory role.",
      "Observer — vision + KPIs + feedback only. Follow progress.",
    ],
  },
  {
    title: "Steve, the Startup Assistant",
    items: [
      "Steve is the in-app AI agent, configurable at /agent/config",
      "He has an Identity (name, tone), a Soul (mission, personality), Rules, and Tools",
      "His memory is semantic — he learns from conversations (scope: user/project/global)",
      "Every LLM call is logged in /agent/sessions with full cost tracking",
      "API keys are encrypted AES-256-GCM and managed at /agent/keys",
    ],
  },
  {
    title: "Telegram Bot",
    items: [
      "Configure at /settings/bot (token + chat ID)",
      "/start — get your chat ID",
      "/task [title] — create a task from Telegram",
      "/summary — project summary with AI context",
      "Free text → AI response with full project knowledge",
      "Quiet hours: 22h–9h by default (configurable per member in profile)",
    ],
  },
  {
    title: "Design Principles",
    items: [
      "Dark mode only — neutral grey palette",
      "No icons except sidebar pillar level 1",
      "No emojis in the UI",
      "No gradients, no shadows — borders and background changes only",
      "English only throughout the interface",
      "Footer: Built with Startup OS",
    ],
  },
];

export default function GuidePage() {
  return (
    <PageLayout>
      <Topbar breadcrumb={["Settings", "Guide"]} />
      <main style={{ flex: 1, padding: "1.5rem 1.75rem", overflowY: "auto", maxWidth: "900px", width: "100%", margin: "0 auto" }}>
        <PageTitle title="Guide" description="How to use the cockpit. Start here if you're new." />

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {SECTIONS.map((section) => (
            <section key={section.title} style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.25rem 1.5rem" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)", margin: "0 0 12px" }}>{section.title}</h3>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
                {section.items.map((item, i) => (
                  <li key={i} style={{ fontSize: "13px", color: "var(--text-2)", paddingLeft: "14px", position: "relative", lineHeight: 1.6 }}>
                    <span style={{ position: "absolute", left: 0, color: "var(--text-3)" }}>·</span>
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </PageLayout>
  );
}
