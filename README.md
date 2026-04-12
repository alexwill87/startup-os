# Startup OS — Cockpit

> The sovereign dashboard for startup teams. From day 1 to Demo Day.

**Live demo:** https://startup-os-deploy.vercel.app
**GitHub:** https://github.com/alexwill87/startup-os

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
git clone https://github.com/alexwill87/startup-os.git
cd startup-os
npm install
```

### 2. Choose your database setup

Startup OS supports **3 database options**:

---

#### Option A — Supabase Cloud (fastest)

Best for: quick start, hosted solution, no server needed.

1. Create a free project at [supabase.com](https://supabase.com)
2. Run all migrations in order in the SQL Editor:
   ```
   supabase/migrations/001_cockpit_tables.sql → 027_comments_entity_key.sql
   seeds/checklist.sql
   seeds/workflow.sql
   ```
3. Set your `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

**Limits:** Free tier = 2 projects, 500MB DB, hosted on AWS.

---

#### Option B — Self-hosted PostgreSQL + PostgREST (sovereign)

Best for: full control, no limits, data stays on your server.

Requirements: Docker, a VPS or local machine.

1. Start a PostgreSQL container (or use an existing one):
   ```bash
   docker run -d --name cockpit-db -e POSTGRES_PASSWORD=yourpass postgres:15
   ```

2. Create the database and apply the self-hosted schema:
   ```bash
   docker exec cockpit-db psql -U postgres -c "CREATE DATABASE oa_cockpit;"
   docker exec -i cockpit-db psql -U postgres -d oa_cockpit < setup_selfhosted.sql
   ```

3. Start PostgREST (REST API over PostgreSQL — same protocol as Supabase):
   ```bash
   # Create roles for PostgREST
   docker exec cockpit-db psql -U postgres -d oa_cockpit -c "
     CREATE ROLE anon NOLOGIN;
     CREATE ROLE authenticator LOGIN PASSWORD 'your-password';
     GRANT anon TO authenticator;
     GRANT USAGE ON SCHEMA public TO anon;
     GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
     GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
   "

   # Launch PostgREST
   docker run -d --name cockpit-api -p 3100:3000 \
     -e PGRST_DB_URI="postgres://authenticator:your-password@cockpit-db:5432/oa_cockpit" \
     -e PGRST_DB_SCHEMAS="public" \
     -e PGRST_DB_ANON_ROLE="anon" \
     -e PGRST_JWT_SECRET="your-jwt-secret-min-32-chars" \
     postgrest/postgrest
   ```

4. Set your `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-domain.com   # public URL, NOT localhost
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-generated-jwt>
   NEXT_PUBLIC_AUTH_MODE=selfhosted                    # skips Supabase Auth, auto-login as admin
   ```

5. Add nginx proxy (required — the browser must reach PostgREST via your domain):
   ```nginx
   # PostgREST API
   location /rest/v1/ {
       proxy_pass http://127.0.0.1:3100/;
       proxy_set_header Host $host;
       proxy_set_header Authorization $http_authorization;
       proxy_set_header apikey $http_apikey;
   }

   # Stub endpoints (not available in selfhosted)
   location /auth/v1/ {
       return 501 '{"error":"Auth not available in selfhosted mode"}';
       add_header Content-Type application/json;
   }
   location /realtime/ {
       return 501 '{"error":"Realtime not available in selfhosted mode"}';
       add_header Content-Type application/json;
   }
   ```

The Supabase JS client works with PostgREST out of the box — same API, no code changes.
When `NEXT_PUBLIC_AUTH_MODE=selfhosted`, the app auto-logs in as the first admin member (no magic links needed).

**Advantages:** Unlimited projects, zero cost, data sovereignty, works on any VPS.

---

#### Option C — Custom PostgreSQL (advanced)

If you already have a PostgreSQL server (managed or self-hosted):

1. Apply `setup_selfhosted.sql` to your database
2. Expose it via PostgREST, Hasura, or any REST/GraphQL layer
3. Point `NEXT_PUBLIC_SUPABASE_URL` to your API endpoint

As long as the API follows the PostgREST protocol, the cockpit works unchanged.

---

### 3. Additional environment variables
```
AGENT_KEY_MASTER=<32 bytes base64>           # for API key encryption (optional)
NEXT_PUBLIC_SITE_URL=https://your-domain     # used in notifications and links
```

### 4. Run locally
```bash
npm run dev        # development (port 3000)
PORT=3031 npm start # production (custom port)
```

### 5. Deploy

**Vercel (cloud):**
```bash
vercel --prod
```

**Self-hosted (PM2):**
```bash
npm run build
PORT=3031 pm2 start npm --name "my-cockpit" -- run start
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

- **GitHub:** https://github.com/alexwill87/startup-os
- **Live demo:** https://startup-os-deploy.vercel.app
- **Design System:** [COCKPIT_DESIGN_SYSTEM.md](/COCKPIT_DESIGN_SYSTEM.md)

Built with [Startup OS](https://github.com/alexwill87/startup-os) — the sovereign cockpit for startup teams.
