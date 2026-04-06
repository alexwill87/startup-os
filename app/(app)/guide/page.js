"use client";

import Link from "next/link";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const PILLARS = [
  { id: "why", label: "Why", color: "#3b82f6", icon: "?", desc: "Define your mission, vision, and values. Answer the fundamental questions: what problem do you solve, why you, and where are you going.", start: "/pourquoi" },
  { id: "team", label: "Team", color: "#8b5cf6", icon: "T", desc: "Set up your team. Each member fills their profile (skills, LinkedIn, availability). Assign roles and define collaboration rules.", start: "/equipe/members" },
  { id: "resources", label: "Resources", color: "#10b981", icon: "R", desc: "Centralize everything: links, files, tools, API docs, budget. Your team's shared knowledge base.", start: "/ressources/links" },
  { id: "project", label: "Project", color: "#f59e0b", icon: "P", desc: "The execution engine. Kanban board for tasks, roadmap with milestones, documentation, and retrospectives.", start: "/projet/overview" },
  { id: "market", label: "Market", color: "#ec4899", icon: "M", desc: "Understand your users and competitors. Define personas, track feedback, analyze the market.", start: "/clients/personas" },
  { id: "finances", label: "Finances", color: "#ef4444", icon: "F", desc: "Track money: budget, costs, revenue, burn rate. Know exactly where you stand financially.", start: "/finances/budget-track" },
  { id: "analytics", label: "Analytics", color: "#06b6d4", icon: "A", desc: "Measure everything: KPIs with targets, automated alerts, project health score.", start: "/analytics/kpis" },
];

const STEPS = [
  { num: "1", title: "Complete your profile", desc: "Go to Team > My Profile and fill in your info: bio, phone, LinkedIn, skills, timezone, languages.", href: "/equipe/profile" },
  { num: "2", title: "Explore the 7 pillars", desc: "Click on each pillar in the sidebar to see what needs to be done. Each pillar has a checklist of questions, documents, and actions.", href: "/" },
  { num: "3", title: "Answer the questions", desc: "Each checklist item is a question or deliverable. Click 'Add response' to contribute your answer. The team converges through votes.", href: "/pourquoi" },
  { num: "4", title: "Create tasks", desc: "Go to Project > Board to create and manage tasks. Assign them to team members, set priorities.", href: "/projet/board" },
  { num: "5", title: "Upload documents", desc: "Go to Resources > Files to upload project documents. Each file gets metadata: title, purpose, status, tags.", href: "/ressources/files" },
  { num: "6", title: "Track progress", desc: "The Home page shows overall completion %. Each pillar has its own progress bar. Watch the numbers grow as the team works.", href: "/" },
];

const PAGES = [
  { section: "Navigation", items: [
    { name: "Home", desc: "Overall project health. 7 pillar cards with completion %. Current phase indicator. Recent activity.", href: "/" },
    { name: "Activity", desc: "Real-time feed of everything that happens. Filter by type. Sent to Telegram too.", href: "/activity" },
    { name: "Guide", desc: "This page. How to use Project OS.", href: "/guide" },
    { name: "Feedback", desc: "Suggest improvements, report bugs, vote on ideas.", href: "/feedback" },
  ]},
  { section: "Why", items: [
    { name: "Pillar Dashboard", desc: "Checklist of all Why items. Assign owners, change status, add responses.", href: "/pourquoi" },
    { name: "Vision", desc: "Write your mission, vision, problem statement, north star metric.", href: "/pourquoi/mission" },
    { name: "Strategy Notes", desc: "Team notes by topic: product, market, tech, pitch, monetization, growth.", href: "/pourquoi/vision-strategy" },
    { name: "Decisions", desc: "Propose decisions, vote agree/disagree, resolve with consensus.", href: "/pourquoi/decisions" },
  ]},
  { section: "Team", items: [
    { name: "Members", desc: "Invite members by email (magic link). Manage roles. Send login links.", href: "/equipe/members" },
    { name: "Roles", desc: "Define responsibilities per builder.", href: "/equipe/roles" },
    { name: "My Profile", desc: "Edit your profile: bio, phone, LinkedIn, skills, URLs, timezone, languages.", href: "/equipe/profile" },
  ]},
  { section: "Resources", items: [
    { name: "Links & Docs", desc: "Shared bookmarks categorized and pinnable.", href: "/ressources/links" },
    { name: "Files", desc: "Upload files with metadata. Title, purpose, status, tags. Auto-compress images.", href: "/ressources/files" },
    { name: "Gallery", desc: "Image gallery with lightbox. Grid and list views. Filter by pillar.", href: "/ressources/gallery" },
    { name: "Tools & APIs", desc: "Inventory of tools and API documentation.", href: "/ressources/tools" },
    { name: "Budget", desc: "Cost tracking. Free tier vs paid services.", href: "/ressources/budget" },
  ]},
  { section: "Project", items: [
    { name: "Overview", desc: "Cross-pillar dashboard. All 7 pillar progress bars. Sprint stats. Builder progress.", href: "/projet/overview" },
    { name: "Board", desc: "Kanban board for sprint tasks + checklist action items from all pillars.", href: "/projet/board" },
    { name: "Roadmap", desc: "J1-J5 milestones timeline + sprint accordion + pillar readiness grid.", href: "/projet/roadmap" },
    { name: "Docs", desc: "Required documents (from checklists) + imported documentation.", href: "/projet/docs" },
    { name: "Retro", desc: "Keep / Stop / Try per sprint.", href: "/projet/retro" },
  ]},
  { section: "Market", items: [
    { name: "Personas", desc: "Target user profiles.", href: "/clients/personas" },
    { name: "Competitors", desc: "Competitor analysis.", href: "/clients/competitors" },
    { name: "Feedback", desc: "User feedback log with sentiment.", href: "/clients/feedback" },
  ]},
  { section: "Finances", items: [
    { name: "Budget Tracker", desc: "Monthly expenses.", href: "/finances/budget-track" },
    { name: "Costs", desc: "API cost projections based on usage.", href: "/finances/costs" },
    { name: "Revenue", desc: "MRR tracking with targets.", href: "/finances/revenue" },
  ]},
  { section: "Analytics", items: [
    { name: "KPIs", desc: "Metrics with min/stretch targets. Log entries. History table.", href: "/analytics/kpis" },
    { name: "Alerts", desc: "Automated checks: blocked tasks, stale KPIs, low activity.", href: "/analytics/alerts" },
    { name: "Health", desc: "Per-pillar health score.", href: "/analytics/health" },
  ]},
  { section: "Config", items: [
    { name: "Checklist", desc: "Setup progress in 7 phases.", href: "/setup/checklist" },
    { name: "Settings", desc: "Project name, Telegram bot configuration.", href: "/setup/config" },
    { name: "API Keys", desc: "Secure vault for API keys (OpenRouter, Anthropic, Mistral...).", href: "/setup/api-keys" },
    { name: "Bot", desc: "Choose AI provider/model. Toggle bot capabilities. Test.", href: "/setup/bot" },
    { name: "Roadmap OS", desc: "Product roadmap for Project OS itself.", href: "/setup/roadmap-os" },
    { name: "Changelog", desc: "What was built and when.", href: "/setup/changelog" },
  ]},
];

export default function GuidePage() {
  return (
    <div className="space-y-10">
      <PageHeader title="Guide" subtitle="How to use Project OS" color="#94a3b8" />

      {/* What is Project OS */}
      <Card className="border-l-4 border-l-[#3b82f6]">
        <h2 className="text-lg font-bold text-white mb-3">What is Project OS?</h2>
        <p className="text-sm text-[#94a3b8] leading-relaxed mb-3">
          Project OS is a shared dashboard for teams. It organizes your project into <strong className="text-white">7 pillars</strong> — from mission to analytics. Each pillar has a checklist of questions to answer, documents to produce, and actions to complete.
        </p>
        <p className="text-sm text-[#94a3b8] leading-relaxed">
          Every team member contributes answers. The dashboard tracks completion. An AI bot keeps everyone in sync via Telegram. The goal: <strong className="text-white">everyone on the same page, all the time</strong>.
        </p>
      </Card>

      {/* Getting started */}
      <div>
        <h2 className="text-xs font-bold text-[#94a3b8] mb-4 uppercase tracking-widest">Getting Started</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {STEPS.map((step) => (
            <Link key={step.num} href={step.href}>
              <Card className="h-full hover:border-[#334155] transition-colors cursor-pointer group">
                <div className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-full bg-[#1e3a5f] text-[#93c5fd] flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {step.num}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-[#93c5fd] transition-colors mb-1">{step.title}</h3>
                    <p className="text-[11px] text-[#64748b] leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* The 7 Pillars */}
      <div>
        <h2 className="text-xs font-bold text-[#94a3b8] mb-4 uppercase tracking-widest">The 7 Pillars</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PILLARS.map((p) => (
            <Link key={p.id} href={p.start}>
              <Card className="h-full hover:border-[#334155] transition-colors cursor-pointer group">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: p.color + "15", color: p.color }}>
                    {p.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-[#93c5fd] transition-colors mb-1">{p.label}</h3>
                    <p className="text-[11px] text-[#64748b] leading-relaxed">{p.desc}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* All pages reference */}
      <div>
        <h2 className="text-xs font-bold text-[#94a3b8] mb-4 uppercase tracking-widest">All Pages ({PAGES.reduce((s, p) => s + p.items.length, 0)} total)</h2>
        <div className="space-y-6">
          {PAGES.map((section) => (
            <div key={section.section}>
              <h3 className="text-xs font-bold text-[#64748b] mb-2 pb-1 border-b border-[#1e293b]">{section.section}</h3>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <Link key={item.href} href={item.href}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[#0d1117] transition-colors group">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-white font-medium group-hover:text-[#93c5fd] transition-colors">{item.name}</span>
                      <span className="text-[11px] text-[#475569]">{item.desc}</span>
                    </div>
                    <span className="text-[10px] text-[#334155] font-mono">{item.href}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Roles */}
      <Card>
        <h2 className="text-sm font-bold text-white mb-4">Roles</h2>
        <div className="space-y-2">
          {[
            { role: "Co-founder", color: "#f59e0b", desc: "Full access. Drives the project, validates checklist items, invites members." },
            { role: "Mentor", color: "#8b5cf6", desc: "Can see everything, comment on responses, validate items. Cannot edit content." },
            { role: "Contributor", color: "#3b82f6", desc: "Works on their assigned pillar. Creates tasks, uploads files, answers questions." },
            { role: "Ambassador", color: "#10b981", desc: "Sees Why + Market. Gives feedback from the field." },
            { role: "Prospect", color: "#ec4899", desc: "Sees Why + Market in presentation mode. Gives opinions." },
            { role: "Fan", color: "#64748b", desc: "Follows the project. Read-only." },
            { role: "AI Agent", color: "#06b6d4", desc: "Telegram bot. Reads project data, answers questions, creates tasks." },
          ].map((r) => (
            <div key={r.role} className="flex items-center gap-3 py-1.5">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: r.color }} />
              <span className="text-xs font-bold text-white w-24">{r.role}</span>
              <span className="text-[11px] text-[#64748b]">{r.desc}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
