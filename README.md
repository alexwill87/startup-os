# Startup OS

**An open-source startup operating system.** One repo, one deploy, and your team has a shared brain — from idea to launch.

Define your vision. Set goals. Propose features. Vote as a team. Build with AI agents. Track everything.

> Deploy your own instance in 10 minutes. See Quick Start below.

---

## Why Project OS?

Every startup needs the same things: a clear mission, defined roles, tracked tasks, validated features, and a way to make decisions together. Most teams cobble this together with Notion + Slack + Linear + Google Docs.

**Project OS replaces all of that** with one dashboard where:
- Every team member has a **role-based view** (admin, cofounder, mentor, observer)
- Features go through a **democratic validation pipeline** (propose → vote → build → control)
- AI agents help **fill forms, generate ideas, and keep everyone in sync**
- A **76-item checklist** tracks everything a startup needs to launch

---

## Features

### 9 Pillars

| Pillar | What it covers | Pages |
|--------|---------------|-------|
| **Purpose** | Mission, vision, goals with validation | Vision, Goals |
| **Team** | Members directory, roles, agents, onboarding | Members, Agents, Roles, Onboarding |
| **Resources** | Documents, links, files | Documentation, Links, Files |
| **Product** | Feature pipeline, discovery, roadmap | Roadmap, Features, Find, Retro, Feedback |
| **WorkList** | Task execution and workflow templates | Tasks (Board/Gantt), Workflow |
| **Market** | User research and competitive analysis | Personas, Competitors, User Feedback |
| **Finances** | Budget, cost projections, revenue tracking | Budget, Costs, Revenue |
| **Analytics** | KPIs, automated alerts, health scoring | KPIs, Alerts, Health |
| **Config** | Project settings, bot, profile, guide | Settings, Profile, Checklist, Bot, Guide |

### Feature Validation Pipeline

```
Find (AI discovers ideas) → Features (team proposes) → Vote (2/3 required)
→ Tasks (assigned to people + agents) → Build → Control → Deploy
```

Every feature goes through a **workflow template** with configurable steps:
Preparation → Internal Reference → External Research → Communication → Debate → Definition → Configuration → Build → Test → Review → Confirmation

### Goals System

- Up to **3 goals per pillar** (7 pillars)
- Written large, readable by everyone
- **Agree/Disagree/Neutral** voting with comments
- **2/3 majority** to lock a goal
- Each goal has: **Lead** (responsible), **Controller** (validator), **Agent** (AI helper)
- Editing a locked goal resets all votes

### AI Integration

| Agent | Interface | Capabilities |
|-------|-----------|-------------|
| **In-app Assistant** | Side panel (purple "AI" button) | Read project data, fill profiles, create tasks/goals/decisions, answer questions |
| **Telegram Bot** | @the productPMBot | `/task`, `/summary`, free-text AI responses, notifications on all actions |
| **AI Suggest** | Inline buttons on forms | Auto-fill feature description, KPI, prompt, checklist from title |
| **AI Find** | Discovery page | Generate 5 feature ideas from project context |
| **Mega Prompt** | Download .md file | Export full project context for external LLMs (Google Deep Research, etc.) |

### Role-Based Access

| Role | See | Do | Use case |
|------|-----|-----|----------|
| **Admin** | Everything | Everything + config | Project manager |
| **Co-founder** | Everything | Create, vote, build | Core team |
| **Mentor** | Everything (read-only) | Comment, vote | Advisors |
| **Observer** | Purpose + Analytics + Feedback | Submit feedback | Prospects, fans, investors |

### Key Technical Features

- **Real-time** — Supabase Realtime on all tables, instant updates
- **Feedback widget** — Floating button on every page (site/form/content targeting)
- **Public member profiles** — `/equipe/member/[id]` with activity feed
- **Gantt view** — Tasks timeline by feature
- **Kanban views** — Features and Tasks
- **Download/Upload JSON** — Bulk import tasks and features via LLM prompts

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.2 (App Router, Turbopack) |
| Styling | Tailwind CSS v4 |
| Database | Supabase PostgreSQL (17+ tables) |
| Auth | Supabase Auth (magic link, invitation only) |
| Realtime | Supabase Realtime (WebSockets) |
| Storage | Supabase Storage (`project-files` bucket) |
| AI | OpenRouter / Anthropic / Mistral (configurable) |
| Bot | Telegram webhook → LLM |
| Hosting | Vercel |

---

## Database (18 migrations)

### Core Tables

| Table | Purpose |
|-------|---------|
| `cockpit_tasks` | Sprint tasks with feature link, workflow step, subtasks, deadlines |
| `cockpit_decisions` | Team proposals with agree/disagree votes |
| `cockpit_comments` | Generic comments (on goals, vision, decisions) with vote |
| `cockpit_objectives` | Goals per pillar with Lead/Controller/Agent assignments |
| `cockpit_vision` | Vision statements, strategy notes, features, discoveries, workflow |
| `cockpit_members` | Team directory with profiles, roles, skills, avatar |
| `cockpit_activity` | Audit log of all actions (with Telegram notifications) |
| `cockpit_config` | Key-value settings (bot token, validation thresholds) |
| `cockpit_api_keys` | Encrypted API key vault |
| `cockpit_files` | File upload metadata |
| `cockpit_checklist` | 76-item startup checklist (source of truth) |
| `cockpit_responses` | Collaborative answers to checklist items |
| `cockpit_feedback` | Feature requests, bugs, improvements |
| `cockpit_votes` | Unique votes (1 per person per item) |
| `cockpit_kpis` | Business metrics per sprint |
| `cockpit_resources` | Links, bookmarks, tools, API docs |
| `cockpit_retro` | Retrospective (Keep/Stop/Try) |
| `cockpit_objective_validations` | Legacy validation tracking |

---

## Quick Start

### Prerequisites
- Node.js 20+
- [Supabase](https://supabase.com) project (free tier works)
- [Vercel](https://vercel.com) account (free tier works)

### 1. Clone and install
```bash
git clone https://github.com/alexwill87/startup-os.git
cd startup-os
npm install
```

### 2. Set up Supabase
1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard)
2. Run all SQL files in `supabase/migrations/` in order (001 → 018)
3. Run the seed files in `seeds/` (checklist.sql, workflow.sql) — template data for any startup
4. Set **Site URL** in Authentication > URL Configuration

### 3. Configure environment
```bash
cp .env.example .env.local
# Add: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
```

### 4. Create first admin
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

## Use It For Your Own Project

Project OS is designed to be **reusable for any startup**. To adapt it:

1. **Fork this repo**
2. Run the migrations on your own Supabase project
3. Set your project name in Config > Project Settings
4. Invite your team via Team > Members
5. Define your vision and goals
6. Start proposing features

### Contributing

We welcome contributions! If you're using Project OS for your own project and want to improve it:

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/my-improvement`)
3. Make your changes
4. Submit a Pull Request

**Priority areas for contribution:**
- [ ] Multi-language support (i18n)
- [ ] Mobile responsive improvements
- [ ] Email notifications (alongside Telegram)
- [ ] Google Drive / Notion integration
- [ ] Export to PDF / pitch deck
- [ ] Custom themes / branding
- [ ] Improved Gantt chart (drag & drop)
- [ ] Agent capabilities (auto-fill forms from documents)

---

## Architecture

```
app/
├── (app)/                    # Authenticated routes (52 pages)
│   ├── page.js               # Home dashboard (role-based)
│   ├── activity/             # Real-time activity feed
│   ├── analytics/            # KPIs, Alerts, Health
│   ├── clients/              # Personas, Competitors, Feedback
│   ├── equipe/               # Members, Agents, Roles, Profile, Onboarding
│   │   └── member/[id]/      # Public member profile
│   ├── feedback/             # Feature requests & bugs
│   ├── finances/             # Budget, Costs, Revenue
│   ├── guide/                # Documentation
│   ├── leaderboard/          # Gamification
│   ├── objectives/           # Goals (7 pillars × 3 max)
│   ├── pourquoi/             # Vision, Strategy, Decisions
│   ├── projet/               # Features, Find, Tasks, Workflow, Roadmap, Docs, Retro
│   ├── ressources/           # Links, Files
│   └── setup/                # Config, API Keys, Bot, Checklist
├── api/
│   ├── chat/route.js         # In-app AI assistant (reads + writes to DB)
│   └── telegram/route.js     # Telegram bot webhook
├── components/
│   ├── AuthGate.js           # Auth wrapper + Sidebar + Feedback + Chat
│   ├── Card.js               # Reusable card container
│   ├── ChatPanel.js          # AI assistant side panel
│   ├── FeedbackWidget.js     # Floating feedback button
│   ├── LoginScreen.js        # Magic link login
│   ├── PageHeader.js         # Page title + actions
│   ├── PillarDashboard.js    # Checklist per pillar
│   └── Sidebar.js            # Navigation (9 pillars, role-filtered)
└── lib/
    ├── AuthProvider.js       # Auth context + useMembers() + permissions
    ├── activity.js           # logActivity() + Telegram notifications
    ├── completion.js         # Checklist completion %
    ├── supabase.js           # Client + SPRINTS config
    ├── sync-checklist.js     # DISABLED (manual only)
    └── votes.js              # Unique vote system
```

---

## Roadmap

| Milestone | Status |
|-----------|--------|
| J1 — Foundation (Auth, DB, Deploy) | Done |
| J2 — Structure (Checklist, Pillars, Activity) | Done |
| J3 — Connection (Board ↔ Checklist, Cross-pillar) | Done |
| J4 — Intelligence (AI agents, Validation, Roles) | **In Progress** |
| J5 — Polish (CSS, Export, Themes, Open-source) | Planned |

---

## Team

| Role | Description |
| Admin | Project manager, full control |
| Co-founder | Core team, create and vote |
| Mentor | Read-only, comment and advise |
| Observer | View purpose and KPIs, give feedback |
|------|------|
| @the productPMBot | Telegram Bot Agent |

---

## License

MIT — use it for your own projects.

---

Built with [Claude Code](https://claude.ai/code).
