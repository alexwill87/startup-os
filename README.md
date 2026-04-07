# Project OS — Radar Cockpit

**An open-source startup operating system.** One repo, one deploy, and your team has a shared brain — from idea to launch.

Every team member answers the same questions. Every answer is visible. Every decision is tracked. The dashboard shows what's done, what's missing, and who's responsible. AI agents keep everyone in sync.

Built with Next.js 16, Supabase, Tailwind CSS v4, and Claude AI. Currently dogfooded by the [Radar](https://github.com/abdulmalikajibadecodes/radar-foundation) team during the AI Tinkerers Paris hackathon (April 2026).

> **Live:** https://radar-cockpit.vercel.app

---

## Table of Contents

- [Vision](#vision)
- [How It Works](#how-it-works)
- [All Pages (58 routes)](#all-pages-58-routes)
- [Database Schema (17 tables)](#database-schema-17-tables)
- [Roles & Permissions](#roles--permissions)
- [AI Agents](#ai-agents)
- [Key Workflows](#key-workflows)
- [What Works Today](#what-works-today)
- [Known Issues](#known-issues)
- [Roadmap](#roadmap)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Deployment](#deployment)

---

## Vision

Radar monitors every job platform you care about — the moment a matching opportunity appears, it sends you an instant alert with a tailored CV and pitch.

**Project OS** is the cockpit that lets the Radar team:
- **Distribute work** across pillars, projects, and tasks — humans and AI agents alike
- **Track progress** via a 76-item checklist as the single source of truth
- **Make decisions together** with structured votes and 2-person validation
- **Onboard anyone** — cofounders, mentors, contributors, ambassadors, prospects, fans
- **Stay in sync** via Telegram bot, activity feed, and real-time updates

---

## How It Works

### The 7 Pillars

Every startup needs answers to the same fundamental questions. Project OS organizes them into 7 pillars:

| Pillar | Questions it answers | Key pages |
|--------|---------------------|-----------|
| **Why** | What's the mission? What problem do we solve? Why us? | Vision, Strategy Notes, Decisions |
| **Team** | Who's on the team? What are their roles and skills? | Members, Roles, Profiles |
| **Resources** | What tools do we use? What's our budget? Where are our docs? | Links, Files, Gallery, Tools, Budget |
| **Project** | What are we building? What's the roadmap? How are we tracking? | Overview, Board, Roadmap, Docs, Retro |
| **Market** | Who are our users? Who are our competitors? | Personas, Competitors, Feedback |
| **Finances** | What's our burn rate? What's our business model? | Budget, Costs, Revenue |
| **Analytics** | What are our KPIs? Are we on track? | KPIs, Alerts, Health |

### The Checklist System

76 items across 7 pillars define everything a project needs. Each item is a **question**, **document**, or **action**:

- **Questions**: "What is our mission?", "Who are our personas?"
- **Documents**: mission.md, roadmap.md, pitch_deck.pdf
- **Actions**: "All profiles completed", "10+ tasks created"

Each item has: status (`todo` → `in_progress` → `done` → `validated` → `skipped`), owner, notes, format expected.

**Important:** Checklist items are marked done **manually only**. Auto-sync was disabled because seed data was being counted as real work (`lib/sync-checklist.js` is a no-op).

### The Connection Flow

```
Checklist item "Mission statement" (status: todo)
    │
    ├── Visible in: Home (Why pillar %)
    ├── Visible in: Why pillar dashboard (checklist)
    ├── Visible in: Project > Docs (required document)
    │
    └── When team fills it in Why > Vision page
        └── Admin marks it "done" in the checklist
            └── % updates everywhere instantly (Supabase Realtime)
                └── Telegram bot notifies: "✅ Alex completed: Mission statement"
```

---

## All Pages (58 routes)

### Home & Global

| Route | Page | What it does |
|-------|------|-------------|
| `/` | **Home** | Landing page with login (magic link) + redirect to dashboard |
| `/(app)/` | **Dashboard** | Health score (% of active pillars), current sprint stats, 7 pillar cards with counts, recent activity feed, builder roster |
| `/(app)/activity` | **Activity** | Real-time timeline of all actions, filterable by type (task, decision, member, resource, vision, retro, kpi, doc, comment). Realtime subscription. |
| `/(app)/guide` | **Guide** | Onboarding documentation — explains all pages |
| `/(app)/feedback` | **Feedback** | Feature requests & bugs with vote system (unique votes per person), status tracking (new → reviewed → planned → deployed → rejected) |
| `/(app)/leaderboard` | **Leaderboard** | Gamification scores from activity log, filterable by period |
| `/(app)/objectives` | **Objectives** | 10 strategic objectives with 2-person validation. Status: draft → proposed → approved → completed. Each requires approve/reject from 2 validators with comments. |
| `/(app)/athena` | **Athena QA** | Quality audit dashboard with 8 automated checks (not yet a real agent — runs checks against DB data). |

### Why (Pourquoi) — Mission & Strategy

| Route | Page | What it does |
|-------|------|-------------|
| `/(app)/pourquoi` | **Pillar Dashboard** | Checklist for "why" pillar with status, responses, voting |
| `/(app)/pourquoi/mission` | **Mission** | Mission, vision, values — editable text via PillarDashboard |
| `/(app)/pourquoi/vision-strategy` | **Strategy Notes** | Notes by topic (product, market, tech, pitch, monetization, growth) via PillarDashboard |
| `/(app)/pourquoi/decisions` | **Decisions** | Proposals with agree/disagree/neutral votes → resolution via PillarDashboard |

### Team (Equipe) — People & Roles

| Route | Page | What it does |
|-------|------|-------------|
| `/(app)/equipe` | **Pillar Dashboard** | Checklist for "team" pillar |
| `/(app)/equipe/members` | **Members** | Invite by email, manage roles (9 types), send magic links, revoke access. Shows sprint task completion per builder. Realtime subscription. |
| `/(app)/equipe/roles` | **Roles** | Responsibilities per builder (A: Backend/Infra, B: AI/Claude, C: Frontend/React). Custom editable notes. |
| `/(app)/equipe/profile` | **My Profile** | Bio, phone, LinkedIn, Telegram chat ID, skills (tags), languages, timezone, working hours, URLs (GitHub, portfolio). Inline auto-save. |

### Resources (Ressources) — Links, Files & Tools

| Route | Page | What it does |
|-------|------|-------------|
| `/(app)/ressources` | **Pillar Dashboard** | Checklist for "resources" pillar |
| `/(app)/ressources/links` | **Links** | Bookmarks with 10 categories (drive, design, reference, competitor, tool, api_doc, tutorial, inspiration, admin, other). Pin support. |
| `/(app)/ressources/files` | **Files** | Drag-and-drop upload with auto-compression (images >500KB). Metadata: title, pillar, description, purpose, status (draft/review/approved/archived/outdated), tags. Supabase Storage. |
| `/(app)/ressources/gallery` | **Gallery** | Image-only grid/list view from uploaded files. Lightbox with navigation. Filter by pillar. |
| `/(app)/ressources/tools` | **Tools** | Tool and API doc inventory. Cards with open buttons. |
| `/(app)/ressources/budget` | **Budget** | Free tier services (Supabase, Vercel, GitHub) + paid expenses. Monthly burn rate. |

### Project (Projet) — Execution & Planning

| Route | Page | What it does |
|-------|------|-------------|
| `/(app)/projet` | **Pillar Dashboard** | Checklist for "project" pillar |
| `/(app)/projet/overview` | **Overview** | Cross-pillar orchestrator: overall %, task %, blocked count, open decisions, pillar progress bars, builder progress, recent decisions, quick access buttons, activity timeline. |
| `/(app)/projet/board` | **Board** | Kanban (4 columns: To Do, In Progress, Done, Blocked) + sprint filter + task creation form (title, description, builder, priority, ref code). Toggle to Checklist Actions view. Realtime. |
| `/(app)/projet/roadmap` | **Roadmap** | 5 milestones (J1-J5) with status indicators. Sprint timeline with collapsible task lists. Pillar readiness radar. |
| `/(app)/projet/docs` | **Docs** | Required documents from checklist (category="document") + imported docs. Dynamic route `[slug]` for individual docs. |
| `/(app)/projet/retro` | **Retro** | Keep / Stop / Try per sprint. Add/delete items. Realtime. |

### Market (Clients) — Users & Competition

| Route | Page | What it does |
|-------|------|-------------|
| `/(app)/clients` | **Pillar Dashboard** | Checklist for "market" pillar |
| `/(app)/clients/personas` | **Personas** | Target user profiles via PillarDashboard |
| `/(app)/clients/competitors` | **Competitors** | Competition analysis via PillarDashboard |
| `/(app)/clients/feedback` | **User Feedback** | User feedback log via PillarDashboard |

### Finances — Money & Projections

| Route | Page | What it does |
|-------|------|-------------|
| `/(app)/finances` | **Pillar Dashboard** | Checklist for "finances" pillar |
| `/(app)/finances/budget-track` | **Budget** | Monthly burn rate tracker with free/paid services. Add/delete expenses. |
| `/(app)/finances/costs` | **Costs** | API cost breakdown by model (Claude Haiku, Sonnet). Growth projections (10x, 100x, target). |
| `/(app)/finances/revenue` | **Revenue** | MRR targets, progression bar chart, unit economics (ARPU, LTV, CAC). |

### Analytics — KPIs & Health

| Route | Page | What it does |
|-------|------|-------------|
| `/(app)/analytics` | **Pillar Dashboard** | Checklist for "analytics" pillar |
| `/(app)/analytics/kpis` | **KPIs** | Log KPI entries (11 metrics: waitlist, users, CVs, alerts, MRR, platforms...). Min/stretch targets. Progress bars. Historical table. Realtime. |
| `/(app)/analytics/alerts` | **Alerts** | Auto-generated alerts: no KPIs logged (critical), blocked tasks (critical), high burn rate (warning), no pro users (info), low active users (info). |
| `/(app)/analytics/health` | **Health** | Per-pillar health score (0-100%) based on data completeness. Color-coded (green >75%, yellow >50%, red <50%). |

### Config (Setup) — Meta

| Route | Page | What it does |
|-------|------|-------------|
| `/(app)/setup` | **Setup Hub** | Links to all config pages |
| `/(app)/setup/checklist` | **Checklist** | Master view of all 76 items across 7 pillars. Manage status. |
| `/(app)/setup/config` | **Settings** | Project name + Telegram bot token/chat ID |
| `/(app)/setup/api-keys` | **API Keys** | Secure vault. Keys are write-only (masked after save). Supports: OpenRouter, Anthropic, Mistral. Active/inactive toggle. |
| `/(app)/setup/bot` | **Bot** | Choose AI provider/model, toggle capabilities, test bot |
| `/(app)/setup/roadmap-os` | **Roadmap OS** | Product roadmap for Project OS itself |
| `/(app)/setup/changelog` | **Changelog** | What was built and when |

### API Routes

| Route | Method | What it does |
|-------|--------|-------------|
| `/api/telegram` | POST | Telegram webhook. Commands: `/start` (welcome + chat ID), `/task [title]` (creates task), `/summary` (project summary with tasks, decisions, team, KPIs). Free text → LLM response (OpenRouter/Mistral/Anthropic with fallback). Context-aware with project data. |

---

## Database Schema (17 tables)

### cockpit_tasks
Sprint-based kanban tasks.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, auto-generated |
| title | text | NOT NULL |
| description | text | |
| sprint | int2 | 1-4, NOT NULL |
| builder | text | A, B, or C |
| status | text | `todo` / `in_progress` / `done` / `blocked` |
| priority | text | `low` / `medium` / `high` / `critical` |
| task_ref | text | Reference code (A1, B3, C7) |
| pr_url | text | Link to PR |
| created_by | uuid | FK → auth.users |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### cockpit_decisions
Async debates with votes and resolution.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| title | text | NOT NULL |
| context | text | Background info |
| status | text | `open` / `decided` / `revisit` |
| decision | text | Final decision text |
| created_by | uuid | FK → auth.users |
| created_at | timestamptz | |

### cockpit_comments
Responses to decisions with vote position.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| decision_id | uuid | FK → cockpit_decisions (CASCADE) |
| body | text | NOT NULL |
| vote | text | `agree` / `disagree` / `neutral` |
| author_id | uuid | FK → auth.users |
| created_at | timestamptz | |

### cockpit_vision
Strategy notes by topic.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| topic | text | `product` / `market` / `tech` / `pitch` / `monetization` / `growth` / `other` |
| title | text | NOT NULL |
| body | text | NOT NULL |
| builder | text | A, B, or C |
| pinned | boolean | |
| created_by | uuid | FK → auth.users |
| created_at | timestamptz | |

### cockpit_kpis
Business metrics tracked per sprint.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| date | date | NOT NULL |
| sprint | int2 | 1-4 |
| waitlist_signups | int | |
| users_registered | int | |
| users_active_7d | int | |
| cvs_generated | int | |
| alerts_sent | int | |
| users_pro | int | |
| mrr_eur | numeric(10,2) | |
| platforms_live | int | |
| avg_alert_time_sec | int | |
| notes | text | |
| created_by | uuid | FK → auth.users |
| created_at | timestamptz | |

### cockpit_resources
Links, bookmarks, tools, API docs.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| title | text | NOT NULL |
| url | text | |
| category | text | `drive` / `design` / `reference` / `competitor` / `tool` / `api_doc` / `tutorial` / `inspiration` / `admin` / `other` |
| description | text | |
| tags | text[] | Array |
| pinned | boolean | |
| shared_by | uuid | FK → auth.users |
| created_at | timestamptz | |

### cockpit_members
Dynamic team with 9 roles and full profiles.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| email | text | UNIQUE, NOT NULL |
| name | text | |
| role | text | `admin` / `cofounder` / `mentor` / `contributor` / `ambassador` / `prospect` / `fan` / `member` / `viewer` |
| builder | text | A through J |
| color | text | Hex color |
| status | text | `invited` / `active` / `revoked` |
| bio | text | |
| phone | text | |
| linkedin | text | |
| telegram_chat_id | text | |
| skills | text[] | |
| languages | text[] | |
| timezone | text | |
| availability | text | |
| urls | jsonb | `[]` — GitHub, portfolio, etc. |
| avatar_url | text | |
| invited_by | uuid | FK → auth.users |
| user_id | uuid | FK → auth.users |
| last_seen_at | timestamptz | |
| created_at | timestamptz | |

### cockpit_activity
Audit log of all actions with Telegram notifications.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| action | text | `created` / `updated` / `completed` / `commented` / `invited` / `resolved` / `deleted` / `responded` |
| entity_type | text | `task` / `decision` / `member` / `resource` / `vision` / `retro` / `kpi` / `doc` / `comment` |
| entity_id | uuid | |
| entity_title | text | |
| actor_email | text | |
| actor_name | text | |
| metadata | jsonb | `{}` |
| created_at | timestamptz | DESC index |

### cockpit_config
Key-value settings (bot token, chat ID, etc.).

| Column | Type | Notes |
|--------|------|-------|
| key | text | PK |
| value | text | NOT NULL |
| updated_at | timestamptz | |

### cockpit_api_keys
Secure API key vault (write-only, masked display).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| provider | text | NOT NULL |
| label | text | |
| key_hash | text | SHA256 for lookups |
| key_masked | text | e.g. `sk-...a1b2` |
| key_encrypted | text | Full key, base64 encoded |
| added_by | uuid | FK → auth.users |
| added_by_email | text | |
| added_by_name | text | |
| is_active | boolean | |
| scope | text | `project` / `personal` |
| expires_at | timestamptz | |
| created_at | timestamptz | |

### cockpit_files
File upload metadata (Supabase Storage: `project-files` bucket).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| file_name | text | NOT NULL |
| storage_path | text | `{pillar}/{timestamp}-{filename}` |
| pillar | text | `general` / `why` / `team` / `project` / `market` / `finance` / `config` |
| title | text | |
| description | text | |
| purpose | text | |
| status | text | `draft` / `review` / `approved` / `archived` / `outdated` |
| mime_type | text | |
| file_size | bigint | |
| tags | text[] | |
| uploaded_by | uuid | FK → auth.users |
| uploaded_by_name | text | |
| uploaded_by_email | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### cockpit_checklist
76 items across 7 pillars — **the source of truth**.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| pillar | text | `why` / `team` / `resources` / `project` / `market` / `finances` / `analytics` |
| category | text | `document` / `question` / `action` |
| title | text | NOT NULL |
| description | text | |
| format | text | Expected format (e.g. "Short text", "Markdown file") |
| required | boolean | |
| status | text | `todo` / `in_progress` / `done` / `validated` / `skipped` |
| validated_by | uuid | FK → auth.users |
| validated_by_name | text | |
| assigned_to | text | |
| evidence_url | text | |
| notes | text | |
| sort_order | int | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### cockpit_responses
Collaborative answers to checklist items with voting.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| checklist_id | uuid | FK → cockpit_checklist (CASCADE) |
| body | text | NOT NULL |
| author_id | uuid | FK → auth.users |
| author_name | text | |
| author_role | text | |
| votes_up | int | |
| votes_down | int | |
| is_accepted | boolean | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### cockpit_feedback
Feature requests and bug reports.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| type | text | `improvement` / `bug` / `feature` / `question` |
| title | text | NOT NULL |
| body | text | |
| status | text | `new` / `reviewed` / `planned` / `deployed` / `rejected` |
| votes | int | |
| author_id | uuid | FK → auth.users |
| author_name | text | |
| reviewed_by | text | |
| review_note | text | |
| created_at | timestamptz | |

### cockpit_objectives
10 strategic objectives with 2-person validation.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| number | int | 1-10 |
| title | text | NOT NULL |
| description | text | |
| success_criteria | text | |
| pillar | text | |
| status | text | `draft` / `proposed` / `approved` / `completed` |
| proposed_by | text | |
| sort_order | int | |
| created_at | timestamptz | |

### cockpit_objective_validations
Consensus tracking for objectives.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| objective_id | uuid | FK → cockpit_objectives |
| validator_name | text | |
| validator_role | text | |
| decision | text | `approve` / `reject` |
| comment | text | |
| created_at | timestamptz | |

### cockpit_votes
Generic unique vote system (1 vote per person per item).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| entity_type | text | `feedback` / `response` / `decision` |
| entity_id | uuid | |
| direction | text | `up` / `down` |
| voter_id | uuid | FK → auth.users |
| voter_name | text | |
| created_at | timestamptz | |

**Constraint:** UNIQUE(entity_type, entity_id, voter_id)

---

## Data Relationships

```
auth.users
├── cockpit_members (bridge: auth ↔ app roles)
│   └── All tables reference auth.users via created_by / author_id / etc.
│
├── cockpit_decisions (1) → cockpit_comments (N) [CASCADE]
├── cockpit_checklist (1) → cockpit_responses (N) [CASCADE]
├── cockpit_objectives (1) → cockpit_objective_validations (N)
└── cockpit_votes → any entity (feedback, response, decision)
```

All 17 tables have **Row-Level Security** enabled. All require `auth.uid() IS NOT NULL`. Admin operations restricted to `admin` or `cofounder` roles. Self-profile updates allowed.

**Realtime** is enabled on all tables — every change is broadcast to connected clients.

---

## Roles & Permissions

| Role | See | Edit | Validate | Use case |
|------|-----|------|----------|----------|
| **Admin** | Everything | Everything | Everything | Drives the project |
| **Co-founder** | Everything | Everything | Everything | Makes final decisions |
| **Mentor** | Everything | Comments only | Can validate items | Gives feedback, challenges assumptions |
| **Contributor** | Their pillar + Project | Their pillar | No | Executes tasks, fills documents |
| **Ambassador** | Why + Market + Analytics | Feedback only | No | Promotes the project |
| **Prospect** | Why + Market | Feedback only | No | Discovers the project |
| **Fan** | Why (public) | No | No | Follows the project |
| **Member** | Everything | Limited | No | General access |
| **Viewer** | Everything | No | No | Read-only |

> **Note:** Role-based access control is defined but **not yet enforced** in the UI. Currently all authenticated users have full access. Enforcing roles is a J4 priority.

---

## AI Agents

### Telegram Bot (@RadarPMBot)
- **Webhook:** `/api/telegram`
- **Commands:**
  - `/start` — Welcome message with chat ID
  - `/task [title]` — Creates a task in the board
  - `/summary` — Full project summary (tasks, decisions, team, KPIs, recent activity)
  - Free text — Routed to LLM with full project context
- **LLM providers:** OpenRouter (default), Anthropic, Mistral — with automatic fallback
- **Config:** Provider/model/token stored in DB (`cockpit_config` + `cockpit_api_keys`), editable via `/setup/bot`
- **Notifications:** Every action logged in `cockpit_activity` triggers a Telegram message

### Athena (QA Agent) — Planned
- **Page:** `/athena` (UI exists but agent is not yet active)
- **What it will do:** Automated quality audit of the entire project
- **8 criteria planned:** Utility, Completeness, Fluidity, Persistence, Security, Consensus, Documentation, Team
- **Status:** The page renders and runs checks against real data, but Athena is not yet a real agent — it's a dashboard of automated checks. Future work will make it a proper autonomous agent.

---

## Key Workflows

### 1. Checklist → Completion %
```
76 items seeded across 7 pillars
  → Team member marks item as "done" or "validated"
    → completion.js calculates % (required items only)
      → Home, Overview, Roadmap show updated %
        → Telegram notification sent
```

### 2. Collaborative Decision Making
```
Team member proposes an objective
  → Other members review (approve/reject with comments)
    → 2 approvals required → status becomes "approved"
      → Activity logged, Telegram notified
```

### 3. Checklist Responses
```
Checklist item "What is our mission?"
  → Co-founder A writes their answer (response)
    → Co-founder B writes theirs
      → Team votes up/down on each response
        → Best response marked "accepted"
          → Item marked "done" or "validated"
```

### 4. Sprint Cycle
```
Sprint 1 (Apr 5) → Sprint 2 (Apr 12) → Sprint 3 (Apr 19) → Sprint 4 (Apr 26)
  → Tasks assigned per builder per sprint
    → Kanban board tracks status
      → Retro captures Keep/Stop/Try
        → KPIs logged per sprint
```

### 5. Telegram Bot Flow
```
User sends message to @RadarPMBot
  → Webhook hits /api/telegram
    → If command: execute directly (create task, generate summary)
    → If free text: send to LLM with project context
      → Response sent back to Telegram
        → Activity logged
```

---

## What Works Today

### Fully Functional
- 58 routes, all compiling and rendering (Next.js 16.2.2 + Turbopack)
- Supabase Auth with magic link (invitation only)
- 17 tables with RLS policies
- Realtime subscriptions on all tables
- 76-item checklist with manual status management
- Collaborative responses with voting and acceptance
- 10 strategic objectives with 2-person validation
- Kanban board with 4-column drag (sprint-filtered)
- File upload with drag-and-drop and auto-compression
- Image gallery with lightbox
- Telegram bot with 3 commands + LLM free-text
- Activity feed with real-time updates
- Automated alerts (critical/warning/info)
- KPI tracking with targets and projections
- Per-pillar health scoring
- Athena QA agent (8-criteria audit)
- Leaderboard with gamification
- Feedback system with unique votes
- API key vault (write-only, masked)
- Full member profiles (bio, skills, languages, timezone, URLs)

### Partially Working
- Role system: roles are stored but **not enforced** in the UI (everyone has full access)
- Builder assignment: `BUILDERS` object in `lib/supabase.js` is hardcoded to 3 people (A, B, C), but `cockpit_members` supports A-J
- Completion %: calculated from required checklist items only — if no items are marked, everything shows 0%
- Old routes (`/board`, `/docs`, `/vision`, `/retro`, `/resources`, `/kpis`) still exist alongside new routes (`/projet/board`, `/projet/docs`, etc.)

---

## Known Issues

| Issue | Severity | Details |
|-------|----------|---------|
| **Roles not enforced** | Medium | All authenticated users have full CRUD access regardless of role |
| **Seed data in pages** | Low | Some pages have placeholder content that looks like real work |
| **Duplicate routes** | Low | Old flat routes coexist with new nested routes |
| **Builder field limited** | Low | `cockpit_members` accepts A-J but `BUILDERS` in code only defines A-C |
| **Anthropic key exhausted** | Info | Alex's Anthropic API key has no credits — OpenRouter is used as primary |
| **Athena has no builder** | Info | QA agent registered in cockpit_members without a builder letter |
| **Migrations are manual** | Info | SQL migrations must be pasted manually into Supabase SQL Editor by Alex |
| **ALLOWED_EMAILS is stale** | Low | `lib/supabase.js` still has a hardcoded email whitelist alongside the dynamic `cockpit_members` table |

---

## Roadmap

### Milestones

| Milestone | Status | Description |
|-----------|--------|-------------|
| **J1 — Foundation** | DONE | Supabase, Auth, Deploy, 53 routes |
| **J2 — Structure** | DONE | 76 checklist items, pillar dashboards, activity feed |
| **J3 — Connection** | DONE | Board ↔ checklist, Docs ↔ checklist, cross-pillar Overview |
| **J4 — Intelligence** | **NEXT** | AI-powered workflows, role enforcement, bot writes data |
| **J5 — Polish** | PLANNED | CSS, export, themes, open-source launch |

### J4 Priorities (Current)
- [ ] Validated objectives → auto-generate missions in pillars
- [ ] Each checklist item = full card (responses, files, discussions integrated)
- [ ] Role-based access enforcement (mentor = read-only, fan = Why only, etc.)
- [ ] Bot that modifies checklist items via Telegram
- [ ] Daily summary cron via Telegram
- [ ] Leaderboard integrated in Home dashboard

### J5 Priorities (Next)
- [ ] CSS polish (spacing inconsistencies on some pages)
- [ ] View modes: table, gallery, kanban on checklists
- [ ] Export PDF / auto pitch deck
- [ ] Multi-project support
- [ ] Google Drive integration
- [ ] In-app notifications

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router, Turbopack) | 16.2.2 |
| Styling | Tailwind CSS | v4 |
| Database | Supabase PostgreSQL | 17 tables |
| Auth | Supabase Auth | Magic link |
| Realtime | Supabase Realtime | WebSockets |
| Storage | Supabase Storage | `project-files` bucket |
| AI | Claude via OpenRouter / Anthropic / Mistral | Haiku default |
| Bot | Telegram webhook → LLM | @RadarPMBot |
| Hosting | Vercel | Production |

### Key Libraries
- `@supabase/supabase-js` — Database client
- `next` 16.2.2 — Framework
- `tailwindcss` v4 — Styling (`@import "tailwindcss"` syntax)

### Important Technical Decisions
1. **Tailwind v4 + preflight** — DO NOT add `* { margin: 0; padding: 0; }` in globals.css. Tailwind v4 has its own reset. Adding another breaks utility classes.
2. **BUILDERS is an object, not an array** — Use `Object.values(BUILDERS)` to iterate. `BUILDERS.map()` will crash.
3. **Checklist is manual only** — `lib/sync-checklist.js` is a no-op. Do not re-enable auto-sync.
4. **Bot uses DB config** — Token and chat ID come from `cockpit_config` table, not env vars.

---

## Quick Start

### Prerequisites
- Node.js 20+
- A [Supabase](https://supabase.com) project
- A [Vercel](https://vercel.com) account

### 1. Clone and install
```bash
git clone https://github.com/alexwill87/radar-cockpit.git
cd radar-cockpit
npm install
```

### 2. Create Supabase project
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Create a new project
3. Run all SQL files in `supabase/migrations/` in order (001 → 012)
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

---

## Deployment

```bash
cd /home/omar/RADAR/radar-cockpit
npm run build          # Verify compilation (58 routes, 0 errors)
git add -A && git commit -m "description"
git push origin main
vercel --prod --yes    # Deploy to Vercel
```

For new tables: write SQL in `supabase/migrations/`, then paste into Supabase SQL Editor manually.

### Environment Variables (Vercel)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## Shared Components

| Component | Purpose |
|-----------|---------|
| `AuthGate` | Redirects to login if not authenticated |
| `AuthProvider` | React context: user, member, builder, isAdmin |
| `Card` | Reusable card container with dark theme |
| `FileUpload` | Drag-and-drop file handler with compression |
| `LoginScreen` | Magic link login UI |
| `Navbar` | Top navigation bar |
| `PageHeader` | Title + subtitle + color bar + action slot |
| `PillarDashboard` | **Core component** — checklist per pillar with status, responses, voting, validation |
| `Sidebar` | Navigation with 8 sections (7 pillars + Config) |
| `StatusBadge` | Inline status indicator |

---

## Client Libraries

| File | Purpose |
|------|---------|
| `lib/supabase.js` | Supabase client, BUILDERS config, SPRINTS definition |
| `lib/AuthProvider.js` | Auth context, session management, member linking |
| `lib/activity.js` | `logActivity()` — logs to DB + sends Telegram notification |
| `lib/completion.js` | `calculateCompletion()` — % from required checklist items |
| `lib/votes.js` | `castVote()`, `getVoteCounts()`, `hasVoted()` — unique vote system |
| `lib/sync-checklist.js` | **DISABLED** — no-op, do not re-enable |

---

## Team

| Name | Role | Builder | Contact |
|------|------|---------|---------|
| Alex | Admin, Co-founder | B | alexwillemetz@gmail.com |
| Abdulmalik | Backend | A | abdulmalikajibade@gmail.com |
| Loice | Frontend | C | pokamblg@gmail.com |
| Omar | Project Manager (OpenClaw) | — | — |
| @RadarPMBot | Telegram PM Bot (seul agent actif) | — | — |

---

## License

MIT — use it for your own projects.

---

Built with [Claude Code](https://claude.ai/code).
