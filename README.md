# Project OS

**An open-source startup operating system.** One repo, one deploy, and your team has a shared brain — from idea to launch.

Every team member answers the same questions. Every answer is visible. Every decision is tracked. The dashboard shows what's done, what's missing, and who's responsible. An AI bot keeps everyone in sync via Telegram.

Built with Next.js, Supabase, Tailwind CSS, and Claude AI. Currently dogfooded by the [Radar](https://github.com/abdulmalikajibadecodes/radar-foundation) team.

---

## How it works

### The 7 Pillars

Every project needs answers to the same fundamental questions. Project OS organizes them into 7 pillars:

| Pillar | Questions it answers | Key pages |
|--------|---------------------|-----------|
| **Why** | What's the mission? What problem do we solve? Why us? | Vision, Strategy Notes, Decisions |
| **Team** | Who's on the team? What are their roles and skills? | Members, Roles, Profiles |
| **Resources** | What tools do we use? What's our budget? Where are our docs? | Links, Files, Gallery, Tools, Budget |
| **Project** | What are we building? What's the roadmap? How are we tracking? | Overview, Board, Roadmap, Docs, Retro |
| **Market** | Who are our users? Who are our competitors? | Personas, Competitors, Feedback |
| **Finances** | What's our burn rate? What's our business model? | Budget, Costs, Revenue |
| **Analytics** | What are our KPIs? Are we on track? | KPIs, Alerts, Health |

### How pages connect

```
HOME ──────────── Shows all 7 pillar completion %
│                  Links to each pillar dashboard
│
├── ACTIVITY ──── Real-time feed of all changes
│                  Filters by type and person
│                  Sends Telegram notifications
│
├── WHY ──────── Pillar dashboard: checklist + owner + %
│   ├── Vision ── Mission, vision, values (editable text)
│   ├── Notes ─── Strategy notes by topic (product, market, tech...)
│   └── Decisions  Proposals with agree/disagree votes → resolution
│
├── TEAM ─────── Pillar dashboard
│   ├── Members ─ Invite by email, manage roles, send login links
│   ├── Roles ─── Responsibilities per builder
│   └── Profile ─ Each member fills: bio, phone, LinkedIn, skills, URLs
│
├── RESOURCES ── Pillar dashboard
│   ├── Links ─── Shared bookmarks, categorized + pinnable
│   ├── Files ─── Upload with metadata (title, purpose, status, tags)
│   ├── Gallery ─ Image viewer with lightbox + auto-compression
│   ├── Tools ─── API docs and tool inventory
│   └── Budget ── Cost tracking
│
├── PROJECT ──── Cross-pillar orchestrator
│   ├── Overview  All 7 pillars progress + sprint stats + decisions
│   ├── Board ─── Kanban (sprint tasks) + Actions (checklist items)
│   ├── Roadmap ─ J1→J5 milestones + sprint timeline + pillar readiness
│   ├── Docs ──── Required documents (from checklist) + imported docs
│   └── Retro ─── Keep / Stop / Try per sprint
│
├── MARKET ───── Pillar dashboard
│   ├── Personas  Target user profiles
│   ├── Competitors Comparison analysis
│   └── Feedback  User feedback log with sentiment
│
├── FINANCES ─── Pillar dashboard
│   ├── Budget ── Monthly expenses tracker
│   ├── Costs ─── API cost projections
│   └── Revenue ─ MRR tracking with targets
│
├── ANALYTICS ── Pillar dashboard
│   ├── KPIs ──── Metrics with min/stretch targets + history
│   ├── Alerts ── Automated checks (blocked tasks, stale KPIs...)
│   └── Health ── Per-pillar health score
│
└── CONFIG ───── Meta: the cockpit of the cockpit
    ├── Checklist  Onboarding progress (7 phases)
    ├── Settings ─ Project name + Telegram bot setup
    ├── API Keys ─ Secure vault (OpenRouter, Anthropic, Mistral...)
    ├── Bot ────── Choose AI provider/model, toggle capabilities
    ├── Roadmap ── Product roadmap for Project OS itself
    └── Changelog  What was built and when
```

### The Checklist System

76 items across 7 pillars define everything a project needs. Each item is a **question**, **document**, or **action**:

- **Questions**: "What is our mission?", "Who are our personas?"
- **Documents**: mission.md, roadmap.md, pitch_deck.pdf
- **Actions**: "All profiles completed", "10+ tasks created"

Each item has: status (todo → in_progress → done → validated), owner, notes, format expected.

The **Project > Board** shows action items. The **Project > Docs** shows document items. The **Pillar Dashboards** show everything for their pillar. The **Home** shows the overall %.

### The Connection Flow

```
Checklist item "Mission statement" (status: todo)
    │
    ├── Visible in: Home (Why pillar card)
    ├── Visible in: Why pillar dashboard (checklist)
    ├── Visible in: Project > Docs (required document)
    │
    └── When team fills it in Why > Vision page
        └── Admin marks it "done" in the checklist
            └── % updates everywhere instantly (Supabase Realtime)
                └── Telegram bot notifies: "✅ Alex completed: Mission statement"
```

---

## Roles

Project OS supports different levels of access for different types of contributors:

| Role | See | Edit | Validate | Use case |
|------|-----|------|----------|----------|
| **Co-founder** | Everything | Everything | Everything | Drives the project, makes final decisions |
| **Mentor** | Everything | Comments only | Can validate checklist items | Gives feedback, challenges assumptions |
| **Contributor** | Their pillar + Project | Their pillar | No | Executes tasks, fills documents |
| **Ambassador** | Why + Market + Analytics | Feedback only | No | Promotes the project, reports field insights |
| **Prospect** | Why + Market (presentation mode) | Feedback only | No | Discovers the project, gives opinions |
| **Fan** | Why (public) | No | No | Follows the project |
| **AI Agent** | Everything (via API) | Creates tasks, logs activity | No | Telegram bot, summaries, suggestions |

---

## Collaborative Decision Making

Every checklist item can become a **collaborative question**. Each team member responds. Responses are aggregated to build consensus.

Example: "What problem are we solving?"
- Co-founder A writes their answer
- Co-founder B writes theirs
- Mentor comments with feedback
- The team votes on the best formulation
- Admin validates the final answer

This turns Project OS into a **collective intelligence tool** — not just a dashboard, but a decision-making engine.

---

## Quick Start

### Prerequisites
- Node.js 20+
- A free [Supabase](https://supabase.com) project
- A free [Vercel](https://vercel.com) account

### 1. Clone and install
```bash
git clone https://github.com/alexwill87/radar-cockpit.git
cd radar-cockpit
npm install
```

### 2. Create Supabase project
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Create a new project
3. Run all SQL files in `supabase/migrations/` (in order: 001 → 009)
4. Set **Site URL** in Authentication > URL Configuration

### 3. Configure
```bash
cp .env.example .env.local
# Add your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### 4. Create first admin
In Supabase SQL Editor:
```sql
INSERT INTO cockpit_members (email, name, role, builder, color, status)
VALUES ('you@email.com', 'Your Name', 'admin', 'A', '#3b82f6', 'active');
```

### 5. Run
```bash
npm run dev
```

### 6. Deploy
```bash
vercel --prod
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router) |
| Styling | Tailwind CSS v4 |
| Database | Supabase PostgreSQL (13 tables) |
| Auth | Supabase Auth (magic link) |
| Realtime | Supabase Realtime (websockets) |
| Storage | Supabase Storage (file uploads) |
| AI | Claude via OpenRouter / Anthropic / Mistral |
| Bot | Telegram webhook → Claude Haiku |
| Hosting | Vercel |

---

## Milestones

| Milestone | Status | Description |
|-----------|--------|-------------|
| **J1 — Foundation** | Done | Supabase, Auth, Deploy, 53 routes |
| **J2 — Structure** | Done | 76 checklist items, pillar dashboards, activity feed |
| **J3 — Connection** | Done | Board ↔ checklist, Docs ↔ checklist, cross-pillar Overview |
| **J4 — Intelligence** | Next | Bot writes data, daily summary, role-based access |
| **J5 — Polish** | Planned | View modes, export, themes, open-source launch |

---

## License

MIT — use it for your own projects.

---

Built with Claude Code.
