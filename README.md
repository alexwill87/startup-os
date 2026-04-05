# Project OS

**An open-source team dashboard for builders.** One repo, one deploy, and your team has a shared brain for any project — hackathon, startup, or side project.

Built with Next.js, Supabase, and Tailwind CSS. Currently dogfooded by the [Radar](https://github.com/abdulmalikajibadecodes/radar-foundation) team during the AI Tinkerers Paris "Spring Sprint" hackathon.

---

## What it does

Project OS organizes everything a team needs into **7 pillars**:

| Pillar | What's inside |
|--------|---------------|
| **Pourquoi** | Mission, vision, strategy notes, team decisions with votes |
| **Équipe** | Members, roles, skills, invite system with magic links |
| **Ressources** | Shared links, tools, API docs, budget tracking |
| **Projet** | Kanban board, sprint roadmap, retrospectives, documentation |
| **Clients & Marché** | Personas, competitor analysis, user feedback log |
| **Finances** | Budget tracker, cost projections, revenue tracking |
| **Analytics** | KPIs with targets, automated alerts, project health score |

Plus:
- **Setup & Checklist** — Guided onboarding with progress tracking
- **Real-time sync** — All changes sync instantly via Supabase Realtime
- **Invitation only** — Admin invites members by email (magic link, no password needed)
- **Collapsible sidebar** — Clean navigation across all 7 pillars

---

## Quick Start

### Prerequisites

- Node.js 20+
- A free [Supabase](https://supabase.com) project
- A free [Vercel](https://vercel.com) account (or any hosting)

### 1. Clone and install

```bash
git clone https://github.com/alexwill87/radar-cockpit.git
cd radar-cockpit
npm install
```

### 2. Create your Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create a new project
2. Go to **SQL Editor** and run the migrations in order:
   - `supabase/migrations/001_cockpit_tables.sql` — Core tables (tasks, decisions, retro, docs)
   - `supabase/migrations/002_kpis_resources.sql` — KPIs, resources, vision
   - `supabase/migrations/003_members_invites.sql` — Team members & invitations
3. Go to **Authentication > URL Configuration**:
   - Set **Site URL** to your deployment URL (e.g. `https://your-app.vercel.app`)
   - Add `https://your-app.vercel.app/**` to **Redirect URLs**

### 3. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Find these in **Supabase > Settings > API**.

### 4. Create the first admin

In **Supabase > SQL Editor**, run:
```sql
-- Create yourself as admin
INSERT INTO cockpit_members (email, name, role, builder, color, status)
VALUES ('your@email.com', 'Your Name', 'admin', 'A', '#3b82f6', 'active');
```

Then go to **Authentication > Users > Add User** and create an account with the same email.

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign in, and you're in.

### 6. Deploy to Vercel

```bash
vercel --prod
```

Or connect the repo to Vercel and it auto-deploys on push.

---

## Project Structure

```
radar-cockpit/
├── app/
│   ├── (app)/                    # All authenticated pages
│   │   ├── pourquoi/             # Pillar 1: Why
│   │   │   ├── mission/          # Mission & Vision
│   │   │   ├── vision-strategy/  # Strategy notes
│   │   │   └── decisions/        # Team decisions
│   │   ├── equipe/               # Pillar 2: Team
│   │   │   ├── members/          # Members + invite system
│   │   │   └── roles/            # Roles & skills
│   │   ├── ressources/           # Pillar 3: Resources
│   │   │   ├── links/            # Shared links & docs
│   │   │   ├── tools/            # Tools & APIs
│   │   │   └── budget/           # Budget tracking
│   │   ├── projet/               # Pillar 4: Project
│   │   │   ├── overview/         # Sprint dashboard
│   │   │   ├── board/            # Kanban board
│   │   │   ├── roadmap/          # Sprint roadmap
│   │   │   ├── docs/             # Documentation
│   │   │   └── retro/            # Retrospectives
│   │   ├── clients/              # Pillar 5: Market
│   │   │   ├── personas/         # User personas
│   │   │   ├── competitors/      # Competitor analysis
│   │   │   └── feedback/         # User feedback
│   │   ├── finances/             # Pillar 6: Finances
│   │   │   ├── budget-track/     # Budget tracker
│   │   │   ├── costs/            # Cost analysis
│   │   │   └── revenue/          # Revenue tracking
│   │   ├── analytics/            # Pillar 7: Analytics
│   │   │   ├── kpis/             # KPI tracking
│   │   │   ├── alerts/           # Automated alerts
│   │   │   └── health/           # Project health score
│   │   └── setup/                # Onboarding & config
│   │       ├── checklist/        # Setup progress
│   │       ├── config/           # Project configuration
│   │       └── roadmap/          # Product roadmap
│   ├── components/               # Shared UI components
│   │   ├── Sidebar.js            # Navigation sidebar
│   │   ├── AuthGate.js           # Auth wrapper
│   │   ├── LoginScreen.js        # Login page
│   │   ├── Card.js               # Card component
│   │   └── PageHeader.js         # Page header
│   ├── globals.css               # Tailwind + custom styles
│   ├── layout.js                 # Root layout
│   └── page.js                   # Home dashboard
├── lib/
│   ├── supabase.js               # Supabase client + config
│   └── AuthProvider.js           # Auth context (dynamic members)
├── supabase/
│   └── migrations/               # SQL migrations (run in order)
├── scripts/
│   └── seed-docs.js              # Import docs from markdown
└── public/
    └── icon.svg                  # Favicon
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router) |
| Styling | Tailwind CSS v4 |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth (magic link + password) |
| Realtime | Supabase Realtime (websockets) |
| Hosting | Vercel |

## Roles

| Role | Can do |
|------|--------|
| **Admin** | Invite members, change roles, revoke access, everything else |
| **Member** | Read and write all data, create tasks, post decisions |
| **Viewer** | Read-only access (planned) |

## Roadmap

### V1 — MVP (current)
- [x] 7 pillars with sub-pages
- [x] Sidebar navigation
- [x] Invitation-only auth (magic link)
- [x] Kanban board with sprints
- [x] Decisions with votes
- [x] KPI tracking with targets
- [x] Documentation viewer/editor
- [x] Retrospectives (keep/stop/try)
- [x] Resources & links management
- [x] Setup checklist with progress
- [x] Real-time sync on all pages
- [x] Responsive layout

### V2 — Polish
- [ ] Wizard guided onboarding (step by step)
- [ ] File uploads (PDFs, images per member)
- [ ] Notifications (email digest, in-app)
- [ ] Presentation mode (read-only, shareable)
- [ ] Custom themes / branding
- [ ] Activity feed with timeline
- [ ] Search across all pillars

### V3 — Intelligence
- [ ] AI Co-Pilot (Claude integration)
- [ ] Auto-generated pitch deck
- [ ] Connectors (Slack, Calendar, GitHub)
- [ ] Export to PDF / Notion
- [ ] Multi-project support
- [ ] Public sharing (data room for investors)

---

## Dogfooding: Radar

This dashboard is currently used by the Radar team:
- **Radar** is an AI-powered job monitoring tool that sends real-time alerts with tailored CVs
- **3 builders**: Abdulmalik (Backend), Alex (AI/Claude), Loice (Frontend)
- **Hackathon**: AI Tinkerers Paris — Spring Sprint (4 Sundays, April 2026)
- **Public repo**: [radar-foundation](https://github.com/abdulmalikajibadecodes/radar-foundation)

---

## License

MIT — use it for your own projects, hackathons, startups.

---

Built with Claude Code.
