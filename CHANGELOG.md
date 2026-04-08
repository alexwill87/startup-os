# Changelog

All notable changes to Startup OS.

## [0.4.0] — 2026-04-08 (J4 Intelligence)

### Added
- **AI Chatbot** — In-app assistant that reads project data and writes to DB (profile, tasks, goals, decisions, vision)
- **AI Suggest** — Inline buttons on feature forms to auto-fill description, KPI, prompt, checklist
- **AI Find** — Discovery page with AI-generated feature ideas + mega prompt download + JSON upload
- **Features page** — Unified pipeline: propose → vote (2/3) → build → control → deploy
- **Tasks page** — Board (kanban) + My Tasks + Gantt view with subtasks
- **Workflow template** — 11 configurable steps per feature (editable, reorderable)
- **Goals system** — Up to 3 per pillar, agree/disagree/neutral voting, 2/3 to lock, Lead/Controller/Agent assignments
- **Vision validation** — Same pattern as Goals (large text, comments, voting, lock)
- **Public /apply page** — Anyone can request access (observer, mentor, cofounder)
- **Public member profiles** — `/equipe/member/[id]` with activity feed
- **Feedback widget** — Floating button on every page (site/form/content targeting)
- **Dynamic branding** — Project name + logo from DB, appears everywhere (sidebar, home, landing, apply, favicon)
- **Landing page** — Marketing page with feature cards, login, and apply link (all content from DB)
- **Supabase Setup** — 6-section configuration guide with auto-checks
- **Email template generator** — Branded HTML for Magic Link + Confirm Signup
- **Agents directory** — List of AI agents (Telegram bot, in-app assistant)
- **Onboarding** — Role-based, hierarchical (admin sees all, each role sees below)
- **Role definitions** — 4 roles (admin, cofounder, mentor, observer) with org chart
- **Avatar upload** — URL-based avatar in profile
- **Download/Upload JSON** — Bulk import features and tasks via LLM prompts
- **setup.sql** — Single file combining all 18 migrations + seeds

### Changed
- **Sidebar restructured** — Purpose (Vision, Goals), Team (Members, Agents, Roles, Onboarding), Resources (Documentation, Links, Files), Product (Roadmap, Features, Find, Retro, Feedback), WorkList (Tasks, Workflow), Market, Finances, Analytics, Config
- **Board + Overview merged** into Features page
- **Objectives → Goals** rename with comments and agree/disagree/neutral voting
- **Profile** — Read mode by default, Edit button, all fields visible when empty ("Not defined")
- **Config** — Multi-column layout, API keys integrated, validation thresholds, Supabase Setup separated
- **Resources simplified** — 3 pages (Documentation, Links, Files) instead of 6
- **Strategy Notes + Decisions** removed from Purpose sidebar (still accessible)
- **Roles** — Simplified to 4 levels (admin, cofounder, mentor, observer)
- **Members** — Dynamic from DB, removed hardcoded BUILDERS and ALLOWED_EMAILS

### Fixed
- Features not appearing after creation (topic constraint + missing fetchAll)
- Goals not displaying (resilient fetch if migration not applied)
- Landing page showing "Startup OS" instead of project name (RLS bypass via /api/project)
- Favicon not updating (serve image bytes instead of redirect)
- /apply blocked by AuthGate (PUBLIC_ROUTES bypass)
- AI suggestions too verbose (added "RESPOND WITH ONLY..." preamble)

### Infrastructure
- **2 repos**: startup-os (public, generic) + radar-cockpit (private, Radar-specific)
- **2 Supabase instances**: separated platform from project data
- **Seeds directory**: checklist (70 items) + workflow (11 steps) separated from migrations
- **CONTRIBUTING.md**: fork/PR guidelines, code conventions, priority areas
- **18 migrations**: extended cockpit_tasks, generic comments, simplified roles

## [0.3.0] — 2026-04-07 (J3 Connection)

### Added
- Board ↔ Checklist connection
- Docs ↔ Checklist connection
- Cross-pillar Overview dashboard
- Completion % based on required checklist items only
- Telegram bot notifications on all actions

## [0.2.0] — 2026-04-06 (J2 Structure)

### Added
- 76 checklist items across 7 pillars
- PillarDashboard component with responses and voting
- Activity feed with real-time updates
- File uploads with drag-and-drop and auto-compression
- API key vault (write-only, masked)
- Leaderboard with gamification

## [0.1.0] — 2026-04-05 (J1 Foundation)

### Added
- Supabase PostgreSQL (13 initial tables)
- Auth system (magic link, invitation only)
- Vercel deployment
- Telegram bot (@RadarPMBot)
- 53 initial routes
- 7 pillars: Why, Team, Resources, Project, Market, Finances, Analytics
