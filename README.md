# Startup OS — Cockpit

> The sovereign dashboard for startup teams. From day 1 to Demo Day.

**Live:** https://radar-cockpit.vercel.app
**Upstream (open-source):** https://github.com/alexwill87/startup-os

---

## What is this?

A team cockpit that helps startup founders **work together effectively** — know what to do, in what order, communicate and decide together.

Built for **3 audiences**:
1. **The internal team** (cofounders) → pilot daily work
2. **Mentors** → comment, vote, advise
3. **Observers** (ambassadors, investors) → follow progress

---

## Architecture

| Layer | Tech |
|---|---|
| Frontend | Next.js 16, React, Tailwind CSS v4 |
| Backend | Supabase (PostgreSQL, Auth, Realtime, Storage) |
| AI Agent | Steve (Startup Assistant) — configurable from UI |
| Hosting | Vercel |
| Design System | Cockpit Design Charter v3 (neutral grey, dark mode) |

### 10 Pillars

| Pillar | Purpose | Pages |
|---|---|---|
| **Home** | Global + personal dashboard | 1 |
| **Focus** | Vision, Sprints, Projects, Tasks, Memory, Alerts | 7 |
| **Product** | Ideas, Features, Feedback | 4 |
| **Market** | Persona, Problems, Competitors, Surveys | 5 |
| **Channels** | Landing, Social, Messaging | 4 |
| **Business** | Finance, Legal, Agenda, KPIs | 5 |
| **Team** | Members, Agents, Roles, Chatroom | 5 |
| **Agent** | Config, Memory, Sessions, Costs, Keys, Models | 7 |
| **Settings** | Project, Workflow, Supabase, Bot, Guide | 6 |
| **Me** | Profile, Onboarding, Preferences, Activity, Resources | 5 |

**53 pages total.** 18 fully functional with Supabase CRUD + realtime. The rest are planned stubs with descriptions of what they will contain.

### Design System

- **Dark mode only** — neutral grey palette (Tailwind `neutral`)
- **No icons** except 10 SVG stroke icons for sidebar pillars
- **No emojis** anywhere in the UI
- **No gradients, no shadows** — separation via borders and background changes
- **English only** — all UI text in English
- **Footer**: `{project.name} · {year} · Built with Startup OS`

Components: `Button`, `Badge`, `PageLayout`, `Topbar`, `PageTitle`, `KpiRow`/`KpiCard`, `Table`, `Form*`, `Footer`, `StubV1Page`, `PillarOverview`

See [COCKPIT_DESIGN_SYSTEM.md](/COCKPIT_DESIGN_SYSTEM.md) and [cockpit_design_charter.html](/cockpit_design_charter.html) for the full specification.

### AI Agent — Steve

The in-house AI assistant, configurable entirely from the UI:
- **Identity**: name, avatar, language, tone
- **Soul**: mission, personality, values, do/don't lists
- **Rules**: hard rules (never violate) + soft rules
- **Tools**: 11 actions (create_task, vote_decision, remember, etc.)
- **Memory**: semantic (pgvector), scoped per user/project/global
- **Observability**: every LLM call logged, cost tracked, sessions recorded

Backend: `lib/agent/context.js` (single source of truth), `lib/agent/crypto.js` (AES-256-GCM for API keys).

Migration: `supabase/migrations/026_agent_tables.sql` (7 tables + pgvector + seed).

---

## Personalization

Everything that makes an instance unique lives in Supabase, **not in code**:
- Project name, logo, description → `/settings/project` page
- Agent personality → `/agent/config` page
- API keys → `/agent/keys` page (encrypted AES-256-GCM)
- The only hardcoded brand: **"Startup OS"** in the footer

The same codebase powers both this instance and the [open-source upstream](https://github.com/alexwill87/startup-os). Different DB = different project.

---

## Roles

| Role | Access | Can do |
|---|---|---|
| **Admin** | Everything | Manage settings, keys, bot, invite/revoke members |
| **Cofounder** | All pillars | Create projects/features/tasks, vote, build |
| **Mentor** | All pillars (read) | Comment, vote, advise |
| **Observer** | Vision + KPIs | Follow progress, submit feedback |

---

## Getting Started

### 1. Clone and install
```bash
git clone https://github.com/alexwill87/radar-cockpit.git
cd radar-cockpit
npm install
```

### 2. Configure Supabase
Create a Supabase project, then run all migrations in order:
```bash
# In Supabase SQL Editor:
supabase/migrations/001_cockpit_tables.sql → 026_agent_tables.sql
seeds/checklist.sql
seeds/workflow.sql
```

### 3. Environment variables
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
AGENT_KEY_MASTER=<32 bytes base64>  # for API key encryption
NEXT_PUBLIC_SITE_URL=https://your-deployment.vercel.app
```

### 4. Run locally
```bash
npm run dev
```

### 5. Deploy
```bash
vercel --prod
```

---

## Sync with Startup OS

This repo can be synced with the upstream open-source repo:
```bash
./scripts/sync-to-startup-os.sh           # dry-run
./scripts/sync-to-startup-os.sh --apply   # execute
```

---

## Contributing

Improvements made here can be contributed back to [Startup OS](https://github.com/alexwill87/startup-os). See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Links

- **Upstream (open-source):** https://github.com/alexwill87/startup-os
- **Live Dashboard:** https://radar-cockpit.vercel.app
- **Design System:** [COCKPIT_DESIGN_SYSTEM.md](/COCKPIT_DESIGN_SYSTEM.md)

Built with [Startup OS](https://github.com/alexwill87/startup-os) — the sovereign cockpit for startup teams.
