# Startup OS

**The open-source operating system for startup teams.**

One repo. One deploy. Your whole team — cofounders, mentors, investors — shares the same dashboard. Define the vision together. Vote on features. Build with AI agents. Ship faster.

> **Deploy in 10 minutes.** See [Quick Start](#quick-start) below.

---

## What is this?

Startup OS replaces the mess of Notion + Slack + Linear + Google Docs with **one integrated dashboard** where:

- **Everyone sees the same thing** — vision, goals, features, tasks, KPIs
- **Decisions are voted on** — 2/3 majority required to validate a feature
- **AI agents help you work** — an in-app assistant fills forms, generates ideas, creates tasks
- **Different people see different things** — 4 access levels from admin to observer
- **Everything is tracked** — activity feed, Telegram notifications, audit log

---

## Who is it for?

| Role | What they do | What they see |
|------|-------------|---------------|
| **Admin** | Manages the cockpit, invites people, configures bots and API keys | Everything |
| **Co-founder** | Proposes features, votes, builds, tracks tasks | Everything |
| **Mentor** | Reviews, comments, validates goals, gives expert opinions | Everything (read-only) |
| **Observer** | Follows progress, gives feedback — ambassadors, prospects, early clients | Vision + KPIs + Feedback |

Each role has its own **onboarding flow** and **personalized dashboard**.

---

## How it works

### 1. Define Purpose
Write your mission, vision, and north star metric. Set up to **3 goals per pillar** (7 pillars). Each goal needs 2/3 votes to lock. Assign a **Lead**, a **Controller**, and an **Agent** to each goal.

### 2. Propose Features
Anyone can propose a feature. The AI assistant helps fill in the description, KPIs, technical prompt, and checklist automatically. Features go through a **validation pipeline**:

```
Find (AI discovers ideas) → Propose → Team votes (2/3) → Build → Control → Deploy
```

### 3. Execute with Workflow
Every feature follows a **customizable workflow** with 11 default steps:
Preparation → Research → Communication → Debate → Definition → Configuration → Build → Test → Review → Confirmation → Launch

### 4. Track Everything
Tasks on a **Kanban board** and **Gantt chart**. KPIs with targets. Automated alerts. Per-pillar health scoring. Leaderboard. Activity feed with Telegram notifications.

---

## The 9 Pillars

| Pillar | What it covers |
|--------|---------------|
| **Purpose** | Vision statements + Goals (with voting and assignments) |
| **Team** | Member directory, agents, roles, onboarding |
| **Resources** | Documentation, links, files |
| **Product** | Feature pipeline, AI discovery, roadmap, retrospective, feedback |
| **WorkList** | Tasks (Board + Gantt), Workflow templates |
| **Market** | Personas, competitors, user feedback |
| **Finances** | Budget, cost projections, revenue tracking |
| **Analytics** | KPIs, automated alerts, health score |
| **Config** | Project settings, profile, bot, API keys, guide |

---

## AI Integration

Startup OS has **3 levels of AI assistance**:

### In-App Assistant (side panel)
A chatbot that knows your entire project — goals, features, team, KPIs. It can:
- Answer questions about the project
- Fill your profile from pasted text
- Create tasks, goals, decisions
- Suggest features and write prompts

### AI Suggest (inline on forms)
When you create a feature, click "AI fill" and it generates:
- Description
- Expected KPI
- Technical prompt for implementation
- Checklist of sub-tasks

### AI Find (discovery page)
Click "AI Find" to generate 5 feature ideas from your project context. Or download a **mega-prompt** to use with any external LLM (ChatGPT, Google Deep Research, Claude), then upload the JSON results.

### Telegram Bot
Notifications on every action. Commands: `/task`, `/summary`, free-text questions. Configurable provider (OpenRouter, Anthropic, Mistral).

---

## Quick Start

### 1. Fork and clone
```bash
git clone https://github.com/alexwill87/startup-os.git
cd startup-os
npm install
```

### 2. Create a Supabase project
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) (free tier works)
2. Create a new project
3. In the SQL Editor, run all files in `supabase/migrations/` in order (001 → 018)
4. Then run the seed files: `seeds/checklist.sql` and `seeds/workflow.sql`
5. Set your **Site URL** in Authentication > URL Configuration

### 3. Configure
```bash
cp .env.example .env.local
# Fill in: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
```

### 4. Create your admin account
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

That's it. Open the app, log in with magic link, and start building.

---

## Onboarding

After deploying, each role has a guided onboarding:

**Admin** (8 steps): Profile → Bot → API Keys → Invite team → Vision → Goals → Checklist → Tasks

**Co-founder** (6 steps): Profile → Read vision → Define goals → Check board → Vote on decisions → Connect Telegram

**Mentor** (5 steps): Profile → Read vision → Review goals → Join decisions → Read strategy

**Observer** (3 steps): Read vision → Check KPIs → Give feedback

---

## Tech Stack

| | |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **Styling** | Tailwind CSS v4 |
| **Database** | Supabase PostgreSQL |
| **Auth** | Magic link (Supabase Auth) |
| **Realtime** | Supabase WebSockets |
| **AI** | OpenRouter / Anthropic / Mistral |
| **Bot** | Telegram webhook |
| **Hosting** | Vercel |

---

## Data Separation

Startup OS cleanly separates **platform** from **project data**:

| In the repo (shared) | In Supabase (private) |
|---|---|
| Pages, components, API routes | Your team members |
| Database schema (migrations) | Your goals, features, tasks |
| Seed templates (checklist, workflow) | Your vision, decisions, votes |
| README, Contributing guide | Your API keys, bot tokens |

When you fork → you get the platform. You create your own Supabase → you get a blank slate. Run the seeds → you get startup questions to answer. Your data never touches the repo.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for full guidelines.

**Quick version:**
1. Fork the repo
2. Create a branch: `git checkout -b feature/my-thing`
3. Make changes, ensure `npm run build` passes
4. Submit a Pull Request

**Priority areas:**
- Multi-language (i18n)
- Mobile responsive
- Email notifications
- Export to PDF
- Integrations (Slack, Google Drive, Notion)
- Better Gantt (drag & drop)
- Testing (unit + E2E)

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for full version history.

**Latest: v0.4.0** — AI chatbot agent, feature pipeline with voting, tasks + Gantt, workflow templates, dynamic branding, public apply page, Supabase setup guide.

---

## License

MIT — use it, fork it, build on it.

---

Built with [Claude Code](https://claude.ai/code).
