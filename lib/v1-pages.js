/**
 * V1 Pages Mapping — Cockpit Design System v3.0
 *
 * Source of truth for the content planned for each V1 page (charter showcase).
 * Used both as:
 *  - Mapping for the catch-all route app/v1/[[...slug]]/page.js
 *  - Product spec (title + description + content) for page-by-page migration
 *
 * V1 route slugs = V2 route slugs, prefixed with /v1.
 * To migrate an individual page: create app/v1/<route>/page.js which takes
 * precedence over the catch-all, using only components from /components/ui/.
 *
 * Product principles guiding every page:
 *  1. Clarity — the page immediately tells you what it does
 *  2. Sync — live data, never stale cache
 *  3. Interactivity — the user acts, doesn't contemplate
 *  4. Complementarity — each page completes the others
 *  5. Depth — every page goes deeper, never a dead end
 */

export const V1_PAGES = {
  // ============================================================
  // HOME — top entry
  // ============================================================
  "": {
    pillar: "Home",
    title: "Home",
    description: "Project overview and your personal work in one place",
    kpis: [
      { label: "Active projects", value: "—", variant: "accent" },
      { label: "Sprint", value: "—", variant: "warn" },
      { label: "Members", value: "—", variant: "default" },
      { label: "My tasks", value: "—", variant: "success" },
    ],
    content: `The Home board is the entry point of the cockpit. It combines two views:

**Global view** (team): a real-time photograph of the whole project — active projects, current sprint, key KPIs, latest activities, critical alerts.

**Personal view**: your own work — your features, your tasks, your pending votes, your notifications, your next sprint.

Session-persistent filters: choose which modules show in each view. Choices remembered for the next session.`,
  },

  // ============================================================
  // FOCUS — work pilot
  // ============================================================
  "focus": {
    pillar: "Focus",
    title: "Focus",
    description: "The work pilot — vision, sprints, projects, tasks, memory, alerts",
    kpis: [
      { label: "Active sprint", value: "—", variant: "accent" },
      { label: "Projects", value: "—", variant: "default" },
      { label: "Tasks", value: "—", variant: "warn" },
      { label: "Alerts", value: "—", variant: "danger" },
    ],
    content: `Overview of the Focus pillar. 6 sub-pages:

• Vision — mission, problem, North Star Metric
• Sprints — weekly time-boxes with 2/3 vote
• Projects — strategic initiatives with Why/How/What
• Tasks — light operational work (kanban Todo / Doing / Done)
• Memory — collective and individual memory
• Alerts — auto and manual alerts on blockers

The Focus board surfaces at a glance the active sprint state, current projects, open tasks and critical alerts.`,
  },
  "focus/vision": {
    pillar: "Focus",
    title: "Vision",
    description: "Mission, vision, problem, North Star Metric",
    kpis: [
      { label: "Sections", value: "4", variant: "accent" },
      { label: "Validated", value: "—", variant: "success" },
      { label: "Comments", value: "—", variant: "default" },
    ],
    content: `Founding document of the project. 4 editable sections: Mission Statement, Vision, Problem, North Star Metric.

Each section accepts comments and votes. Linked to the Projects that support it.`,
  },
  "focus/sprints": {
    pillar: "Focus",
    title: "Sprints",
    description: "Weekly time-boxes, 2/3 vote, kanban of the active sprint",
    kpis: [
      { label: "Active sprint", value: "—", variant: "accent" },
      { label: "Days left", value: "—", variant: "warn" },
      { label: "Features", value: "—", variant: "default" },
      { label: "Velocity", value: "—", variant: "success" },
    ],
    content: `Each sprint = 1 week (Sunday → Sunday). Workflow: Proposed → Approved (2/3 votes) → Active → Completed.

Active sprint highlighted with countdown. Kanban of features and tasks assigned to the current sprint.

Auto-creation of next sprint every Sunday 10am (to enable).`,
  },
  "focus/projects": {
    pillar: "Focus",
    title: "Projects",
    description: "Strategic initiatives with Why/How/What, vote, lock",
    kpis: [
      { label: "Total", value: "—", variant: "accent" },
      { label: "Active", value: "—", variant: "success" },
      { label: "Voting", value: "—", variant: "warn" },
      { label: "Completed", value: "—", variant: "muted" },
    ],
    content: `Projects structure work above features. Each project has a Why, a How, a What, an owner, a controller.

Workflow: Propose → Vote 2/3 → Lock → Activate → Complete → Archive. Categorized by pillar (Product, Market, Channels, Business).`,
  },
  "focus/tasks": {
    pillar: "Focus",
    title: "Tasks",
    description: "Light operational work: Todo / Doing / Done kanban",
    kpis: [
      { label: "Todo", value: "—", variant: "muted" },
      { label: "Doing", value: "—", variant: "accent" },
      { label: "Done", value: "—", variant: "success" },
    ],
    content: `All work that isn't a feature: marketing, communication, research, audit, operations.

Simple 3-step workflow. Each task can support a parent feature. Filters: status, type, owner.

Renamed from "Missions" to "Tasks" for clarity (2026-04-12). DB schema unchanged: tasks are stored as cockpit_features_os rows with work_kind="mission".`,
  },
  "focus/memory": {
    pillar: "Focus",
    title: "Memory",
    description: "Collective and individual memory of the project",
    kpis: [
      { label: "Notes", value: "—", variant: "default" },
      { label: "Mentions", value: "—", variant: "accent" },
      { label: "This week", value: "—", variant: "warn" },
    ],
    content: `Two tabs: Feed (collective) and System (technical logs).

Feed filterable by type, member, period. Search through history. Mention a member to alert them (@name).`,
  },
  "focus/alerts": {
    pillar: "Focus",
    title: "Alerts",
    description: "Auto and manual alerts on project blockers",
    kpis: [
      { label: "Critical", value: "—", variant: "warn" },
      { label: "Warnings", value: "—", variant: "accent" },
      { label: "Info", value: "—", variant: "muted" },
    ],
    content: `Auto: feature blocked >3 days, unresolved dependency, KPI dropping, sprint behind schedule.

Manual: a member creates an alert for the team. Levels: info, warning, critical. Telegram notifications on critical alerts.`,
  },

  // ============================================================
  // PRODUCT — what we build
  // ============================================================
  "product": {
    pillar: "Product",
    title: "Product",
    description: "What we build — ideas, features, feedback",
    kpis: [
      { label: "Ideas", value: "—", variant: "accent" },
      { label: "Active features", value: "—", variant: "warn" },
      { label: "Validated", value: "—", variant: "success" },
      { label: "Open feedback", value: "—", variant: "default" },
    ],
    content: `Overview of the Product pillar. 3 sub-pages:

• Ideas — brainstorm pool with simple voting
• Features — 5-step workflow (Ideated → Defined → Built → Verified → Validated)
• Feedback — bugs, ideas, requests from users

The Product ecosystem turns an idea into a delivered and validated feature.`,
  },
  "product/ideas": {
    pillar: "Product",
    title: "Ideas",
    description: "Brainstorm pool with simple voting",
    kpis: [
      { label: "Total", value: "—", variant: "accent" },
      { label: "Promoted", value: "—", variant: "success" },
      { label: "This week", value: "—", variant: "warn" },
    ],
    content: `Submit an idea, simple upvote. When 2/3 votes reached → "Promote" button → becomes a feature.

Comments, tags, categories. Link to a Problem solved. AI-powered suggestions.`,
  },
  "product/features": {
    pillar: "Product",
    title: "Features",
    description: "Everything that ships in the product, 5-step workflow",
    kpis: [
      { label: "Inbox", value: "—", variant: "muted" },
      { label: "Defined", value: "—", variant: "accent" },
      { label: "Built", value: "—", variant: "warn" },
      { label: "Validated", value: "—", variant: "success" },
    ],
    content: `Workflow Ideated → Defined → Built → Verified → Validated. Team vote to approve. Mandatory documentation (specs, criteria, prerequisites).

Views: Cards, Kanban (drag & drop), Table. Multi-dimensional filters.`,
  },
  "product/feedback": {
    pillar: "Product",
    title: "Feedback",
    description: "Bugs, ideas, requests — one vote per person",
    kpis: [
      { label: "New", value: "—", variant: "accent" },
      { label: "In review", value: "—", variant: "warn" },
      { label: "Deployed", value: "—", variant: "success" },
    ],
    content: `Floating widget + dedicated page. Submit bugs/ideas/requests. Single vote. Admin statuses: reviewed, planned, deployed, rejected.

Convert feedback → idea in one click. Notify the author when their feedback changes status.`,
  },

  // ============================================================
  // MARKET — understand the market
  // ============================================================
  "market": {
    pillar: "Market",
    title: "Market",
    description: "Understand the market — personas, problems, competitors, surveys",
    kpis: [
      { label: "Personas", value: "—", variant: "accent" },
      { label: "Problems", value: "—", variant: "warn" },
      { label: "Competitors", value: "—", variant: "default" },
      { label: "Surveys", value: "—", variant: "success" },
    ],
    content: `Overview of the Market pillar. 4 sub-pages:

• Persona — target personas with attributes
• Problems — customer pain points with severity
• Competitors — competitive analysis
• Surveys — surveys and insights

Understand who you serve, what they feel, how you position.`,
  },
  "market/persona": {
    pillar: "Market",
    title: "Persona",
    description: "Target personas with attributes, needs, pain points",
    kpis: [
      { label: "Personas", value: "—", variant: "accent" },
      { label: "Linked problems", value: "—", variant: "warn" },
      { label: "Targeted features", value: "—", variant: "success" },
    ],
    content: `Each persona has a name, an avatar, attributes (age, role, context), needs, pain points.

Linked to the Problems they feel and the Features that target them. Stats: how many features target this persona.`,
  },
  "market/problems": {
    pillar: "Market",
    title: "Problems",
    description: "Customer pain points, severity, vote, status",
    kpis: [
      { label: "Open", value: "—", variant: "warn" },
      { label: "Linked", value: "—", variant: "accent" },
      { label: "Solved", value: "—", variant: "success" },
    ],
    content: `Document customer pain. CRUD with title, description, severity (low/medium/high/critical).

Vote on the pain (1-5 scale). Comments to share your version. Link to the feature that solves it. Status: open → investigating → linked → solved.`,
  },
  "market/competitors": {
    pillar: "Market",
    title: "Competitors",
    description: "Competitive analysis, feature-by-feature comparison",
    kpis: [
      { label: "Competitors", value: "—", variant: "accent" },
      { label: "Watched", value: "—", variant: "default" },
    ],
    content: `List of competitors with their features, positioning, strengths/weaknesses.

Feature-by-feature comparison table. Links to their sites. Screenshots, watch notes. Alerts when a competitor releases something.`,
  },
  "market/surveys": {
    pillar: "Market",
    title: "Surveys",
    description: "Create and run surveys, track responses",
    kpis: [
      { label: "Surveys", value: "—", variant: "accent" },
      { label: "Responses", value: "—", variant: "success" },
      { label: "Active", value: "—", variant: "warn" },
    ],
    content: `Survey creator: questions, multiple choice, free text. Public URL to share.

Response table. Auto insights: generate personas/problems from responses.`,
  },

  // ============================================================
  // CHANNELS — reach customers
  // ============================================================
  "channels": {
    pillar: "Channels",
    title: "Channels",
    description: "Reach customers — landing, social, messaging",
    kpis: [
      { label: "Visits", value: "—", variant: "accent" },
      { label: "Scheduled posts", value: "—", variant: "warn" },
      { label: "Messages sent", value: "—", variant: "success" },
    ],
    content: `Overview of the Channels pillar. 3 sub-pages:

• Landing — content and stats of the public landing page
• Social — post calendar (Twitter/X, LinkedIn, Instagram)
• Messaging — Email, WhatsApp, Telegram

All acquisition and communication channels.`,
  },
  "channels/landing": {
    pillar: "Channels",
    title: "Landing",
    description: "Content and stats of the public landing page",
    kpis: [
      { label: "Visits", value: "—", variant: "accent" },
      { label: "Signups", value: "—", variant: "success" },
      { label: "Conversion", value: "—", variant: "warn" },
    ],
    content: `Content editor: hero, feature cards, CTA. Conversion stats (visits, waitlist signups).

Simple A/B testing. Live preview.`,
  },
  "channels/social": {
    pillar: "Channels",
    title: "Social",
    description: "Social post calendar, drafts, metrics",
    kpis: [
      { label: "Scheduled", value: "—", variant: "accent" },
      { label: "Drafts", value: "—", variant: "warn" },
      { label: "Published", value: "—", variant: "success" },
    ],
    content: `Post calendar (Twitter/X, LinkedIn, Instagram). Drafts. Per-post metrics (likes, retweets, clicks).

AI-powered post suggestions.`,
  },
  "channels/messaging": {
    pillar: "Channels",
    title: "Messaging",
    description: "Email + WhatsApp + Telegram, direct channels",
    kpis: [
      { label: "Templates", value: "—", variant: "accent" },
      { label: "Sent", value: "—", variant: "success" },
    ],
    content: `Single page with tabs per channel. Message templates. Bulk sending. History of sent messages.

Existing Telegram bot integration.`,
  },

  // ============================================================
  // BUSINESS — run the company
  // ============================================================
  "business": {
    pillar: "Business",
    title: "Business",
    description: "Run the company — finance, legal, agenda, KPIs",
    kpis: [
      { label: "Budget", value: "—", variant: "accent" },
      { label: "Revenue", value: "—", variant: "success" },
      { label: "Deadlines", value: "—", variant: "warn" },
      { label: "KPI health", value: "—", variant: "default" },
    ],
    content: `Overview of the Business pillar. 4 sub-pages:

• Finance — budget, costs, revenue
• Legal — ToS, privacy, contracts, compliance
• Agenda — team calendar, meetings, deadlines
• KPIs — metrics with min/stretch targets

The operational side of a real company.`,
  },
  "business/finance": {
    pillar: "Business",
    title: "Finance",
    description: "Budget, costs, revenue in one page with tabs",
    kpis: [
      { label: "Budget", value: "—", variant: "accent" },
      { label: "Spent", value: "—", variant: "warn" },
      { label: "Revenue", value: "—", variant: "success" },
    ],
    content: `Tabs: Budget, Costs, Revenue. Month-by-month tracking. Overrun alerts.`,
  },
  "business/legal": {
    pillar: "Business",
    title: "Legal",
    description: "ToS, privacy, contracts, compliance",
    kpis: [
      { label: "Documents", value: "—", variant: "default" },
      { label: "Deadlines", value: "—", variant: "warn" },
    ],
    content: `Legal documents with versioning. Partner contracts. Compliance checklist (GDPR, etc.). Important deadlines.`,
  },
  "business/agenda": {
    pillar: "Business",
    title: "Agenda",
    description: "Team calendar, meetings, deadlines",
    kpis: [
      { label: "Today", value: "—", variant: "accent" },
      { label: "This week", value: "—", variant: "warn" },
    ],
    content: `Monthly/weekly calendar. Typed events (meeting, deadline, sprint). Telegram reminders. Google Calendar sync (long term).`,
  },
  "business/kpis": {
    pillar: "Business",
    title: "KPIs",
    description: "Metrics with min/stretch targets, alerts, health score",
    kpis: [
      { label: "Health", value: "—", variant: "success" },
      { label: "In alert", value: "—", variant: "warn" },
      { label: "Metrics", value: "—", variant: "default" },
    ],
    content: `Metrics with min/stretch targets. Evolution graphs. Linked to a project. Auto-update from Supabase or external sources.`,
  },

  // ============================================================
  // TEAM
  // ============================================================
  "team": {
    pillar: "Team",
    title: "Team",
    description: "The team — members, agents, roles, chatroom",
    kpis: [
      { label: "Members", value: "—", variant: "accent" },
      { label: "Active", value: "—", variant: "success" },
      { label: "Agents", value: "—", variant: "default" },
      { label: "Messages", value: "—", variant: "warn" },
    ],
    content: `Overview of the Team pillar. 4 sub-pages:

• Members — list, invite, roles, profiles
• Agents — AI agents (Telegram bot, in-app chatbot)
• Roles — definition of the 4 roles and permissions
• Chatroom — global and per-project chat

Humans and AI, together.`,
  },
  "team/members": {
    pillar: "Team",
    title: "Members",
    description: "List, invite, roles, profiles",
    kpis: [
      { label: "Total", value: "—", variant: "accent" },
      { label: "Active", value: "—", variant: "success" },
      { label: "Invited", value: "—", variant: "warn" },
    ],
    content: `Full list. Invite by email. 4 roles: admin, cofounder, mentor, observer. Link to detailed profile. Skills per member.`,
  },
  "team/agents": {
    pillar: "Team",
    title: "Agents",
    description: "AI agents: Telegram bot, in-app chatbot",
    kpis: [
      { label: "Active", value: "—", variant: "success" },
      { label: "Conversations", value: "—", variant: "default" },
    ],
    content: `List of available AI agents. Per-agent configuration. Usage stats.`,
  },
  "team/roles": {
    pillar: "Team",
    title: "Roles",
    description: "Definition of the 4 roles and their permissions",
    kpis: [
      { label: "Roles", value: "4", variant: "accent" },
    ],
    content: `4 roles: admin, cofounder, mentor, observer. Description, detailed permissions, summary table. Configurable per project (long term).`,
  },
  "team/chatroom": {
    pillar: "Team",
    title: "Chatroom",
    description: "Global chat and per-project chat",
    kpis: [
      { label: "Messages", value: "—", variant: "default" },
      { label: "Online", value: "—", variant: "success" },
    ],
    content: `Global chat #general. Per-project chat (contextualizes discussions). Telegram notifications on mention. Searchable history.`,
  },

  // ============================================================
  // AGENT — AI assistant configuration & supervision
  // ============================================================
  "agent": {
    pillar: "Agent",
    title: "Agent",
    description: "Steve, the Startup Assistant — configuration, memory, sessions, costs",
    kpis: [
      { label: "Status", value: "—", variant: "success" },
      { label: "Sessions", value: "—", variant: "accent" },
      { label: "Cost this month", value: "—", variant: "warn" },
      { label: "Memories", value: "—", variant: "default" },
    ],
    content: `Overview of the Agent pillar. 6 sub-pages:

• Config — Identity, Soul, Rules, Tools (4 tabs)
• Memory — Personal, project, and global memories
• Sessions — Conversation history across all surfaces
• Costs — Token usage, cost per provider/user/activity
• Keys — API key management (encrypted AES-256-GCM)
• Models — LLM model selection per role (chat, embedding, extraction, summary)

The agent (Steve) is configurable entirely from the UI — no code deployment needed to change behavior.`,
  },
  "agent/config": {
    pillar: "Agent",
    title: "Agent Config",
    description: "Identity, Soul, Rules, Tools — 4 tabs to configure Steve",
    kpis: [
      { label: "Identity", value: "1", variant: "success" },
      { label: "Soul", value: "1", variant: "accent" },
      { label: "Rules", value: "—", variant: "default" },
      { label: "Tools", value: "—", variant: "warn" },
    ],
    content: `4 editable tabs:

Identity — name (Steve), avatar, default language, tone
Soul — mission, personality, values, examples, do/don't lists
Rules — hard rules (never violate) + soft rules (follow when possible)
Tools — toggle enabled/disabled per tool, mark requires_confirmation

Versioned: editing creates a new version. Rollback = one click.
Permissions: cofounders only.`,
  },
  "agent/memory": {
    pillar: "Agent",
    title: "Agent Memory",
    description: "Personal, project, and global memories with semantic search",
    kpis: [
      { label: "My memories", value: "—", variant: "accent" },
      { label: "Project", value: "—", variant: "default" },
      { label: "Global", value: "—", variant: "muted" },
    ],
    content: `Each member sees their own memories (scope=user) + project memories (read-only) + global memories (read-only).

Actions on your own memories: forget, edit, export (GDPR).
Semantic search via pgvector embeddings.
Memories are written by the extraction job after each conversation turn.`,
  },
  "agent/sessions": {
    pillar: "Agent",
    title: "Sessions",
    description: "Conversation history across chat and Telegram",
    kpis: [
      { label: "Total", value: "—", variant: "accent" },
      { label: "Today", value: "—", variant: "success" },
      { label: "Avg turns", value: "—", variant: "default" },
    ],
    content: `Paginated list of all sessions, filterable by user, surface (chat/telegram), date, cost.

Click a session → detailed view: all turns, input/output tokens, actions executed, latencies, errors.
Privacy mode: cofounders see metrics but not conversation content of others.`,
  },
  "agent/costs": {
    pillar: "Agent",
    title: "Costs",
    description: "Token usage and cost dashboard per provider, user, activity",
    kpis: [
      { label: "This month", value: "—", variant: "warn" },
      { label: "Last month", value: "—", variant: "muted" },
      { label: "Top user", value: "—", variant: "accent" },
    ],
    content: `Dashboard fed by cockpit_agent_turns:
• Total cost this month vs last month
• Cost by provider (OpenRouter, Anthropic, Mistral, OpenAI)
• Cost by activity (chat, extraction, summary)
• Cost by user (top 10)
• Cost by surface (chat vs telegram)
• Cumulated input/output tokens
• Budget alerts (80% / 100% / 120% of monthly_budget_usd)`,
  },
  "agent/keys": {
    pillar: "Agent",
    title: "API Keys",
    description: "Encrypted key management — add, rotate, budget per key",
    kpis: [
      { label: "Active keys", value: "—", variant: "success" },
      { label: "Providers", value: "—", variant: "accent" },
    ],
    content: `CRUD on cockpit_api_keys_v2:
• Add key (encrypted AES-256-GCM server-side before insert)
• Display: label + provider + last 4 chars only
• Toggle active/inactive
• Monthly budget per key ($20 default)
• Rotate button (replaces key, keeps rotation history)

Master key: AGENT_KEY_MASTER env variable on Vercel. Never in DB.`,
  },
  "agent/models": {
    pillar: "Agent",
    title: "Models",
    description: "Choose the LLM model for each role — chat, embedding, extraction, summary",
    kpis: [
      { label: "Roles", value: "4", variant: "accent" },
      { label: "Active", value: "—", variant: "success" },
    ],
    content: `CRUD on cockpit_agent_models:
• Chat — the model that talks to users (default: claude-3-haiku)
• Embedding — for semantic memory (default: text-embedding-3-small)
• Extraction — for memory extraction after turns (default: claude-3-haiku)
• Summary — for daily summaries (default: mistral-small-latest)

Each role has input/output cost, enabled toggle, default flag.
Providers: OpenRouter, Anthropic, OpenAI, Mistral.`,
  },

  // ============================================================
  // SETTINGS
  // ============================================================
  "settings": {
    pillar: "Settings",
    title: "Settings",
    description: "Cockpit configuration — project, workflow, supabase, bot, guide",
    kpis: [
      { label: "Sub-pages", value: "5", variant: "accent" },
    ],
    content: `Overview of the Settings pillar (admin only). 5 sub-pages:

• Project Settings — name, logo, description, validation rules, API keys
• Workflow — config of the 2 workflows (Feature and Task)
• Supabase — DB instance config
• Bot — Telegram bot config
• Guide — internal documentation

Everything that personalizes this instance lives here.`,
  },
  "settings/project": {
    pillar: "Settings",
    title: "Project Settings",
    description: "Name, logo, description, landing features, validation rules",
    content: `Central project configuration. Everything that personalizes this instance lives here. Name, logo, description are read dynamically by the entire app.

API keys (multi-providers). Telegram bot. Validation rules (% feature vote, % control vote).`,
  },
  "settings/workflow": {
    pillar: "Settings",
    title: "Workflow",
    description: "Configuration of the 2 workflows: Feature and Task",
    content: `Feature workflow: 5 configurable steps (names, fields, required). Task workflow: 3 simple steps.

Customizable per project. Option "who can vote on features".`,
  },
  "settings/supabase": {
    pillar: "Settings",
    title: "Supabase",
    description: "Supabase instance configuration",
    content: `URL, anon key, service role key. Connection test. Table list. View of applied migrations.`,
  },
  "settings/bot": {
    pillar: "Settings",
    title: "Bot",
    description: "Telegram bot configuration",
    content: `Token, admin chat ID, quiet hours, recap times. Bot test. Logs of sent notifications.`,
  },
  "settings/guide": {
    pillar: "Settings",
    title: "Guide",
    description: "Internal cockpit documentation",
    content: `Usage guide for new members. How it works, how to contribute, FAQ.`,
  },

  // ============================================================
  // TEMP-COCKPIT (temporary, admin only)
  // ============================================================
  "temp-cockpit": {
    pillar: "TEMP-COCKPIT",
    title: "TEMP-COCKPIT",
    description: "Temporary admin pillar — will be removed in v1.0",
    content: `Temporary pillar used while building the cockpit itself.

• Cockpit Features — tracker of cockpit features
• Cockpit Vision — progress dashboard

Will be removed when the cockpit reaches v1.0.`,
  },
  "cockpit-feat": {
    pillar: "TEMP-COCKPIT",
    title: "Cockpit Features",
    description: "Tracker of cockpit features (meta)",
    content: `Tracker of the 38+ features of the cockpit itself. 3 views: Cards, Kanban, Table. Filters, sorts, groupings.

5-step workflow, 3 independent validations. Dependencies, sub-features. Will be removed when cockpit reaches v1.0.`,
  },
  "cockpit-vision": {
    pillar: "TEMP-COCKPIT",
    title: "Cockpit Vision",
    description: "Global cockpit progress dashboard",
    content: `10 carved goals with metrics. 5 identified risks. Progress view of the cockpit refactoring project.`,
  },

  // ============================================================
  // ME — personal menu
  // ============================================================
  "me/profile": {
    pillar: "Me",
    title: "Profile",
    description: "Bio, skills, languages, availability, avatar",
    content: `Personal page. Bio, skills, spoken languages, availability, telegram chat ID, avatar.`,
  },
  "me/onboarding": {
    pillar: "Me",
    title: "Onboarding",
    description: "Personalized onboarding journey by role",
    content: `Onboarding checklist by role. Personal progress. Steps: discover, configure, contribute.`,
  },
  "me/preferences": {
    pillar: "Me",
    title: "Preferences",
    description: "Notifications, timezone, language, theme",
    content: `Telegram notifications. Timezone. Language. Theme (dark only for now). Preferred work types to filter "My Work".`,
  },
  "me/activity": {
    pillar: "Me",
    title: "Activity",
    description: "My actions in the cockpit",
    content: `History of my contributions. Filtered on the connected user.`,
  },
  "me/resources": {
    pillar: "Me",
    title: "Resources",
    description: "My bookmarks, links, personal files",
    content: `My personal bookmarks. Links, files, categorization.`,
  },
};

/**
 * Get V1 page info by slug.
 * Returns null if the route doesn't exist in the mapping.
 */
export function getV1Page(slug = "") {
  const key = Array.isArray(slug) ? slug.join("/") : slug;
  return V1_PAGES[key] || null;
}

/**
 * All V1 pillars in sidebar order.
 * Each pillar has:
 *   - root: pillar root page (overview)
 *   - items: sub-pages (categories)
 */
export const V1_PILLARS = [
  { id: "home", label: "Home", root: "", items: [] },
  {
    id: "focus",
    label: "Focus",
    root: "focus",
    items: [
      { slug: "focus/vision", label: "Vision" },
      { slug: "focus/sprints", label: "Sprints" },
      { slug: "focus/projects", label: "Projects" },
      { slug: "focus/tasks", label: "Tasks" },
      { slug: "focus/memory", label: "Memory" },
      { slug: "focus/alerts", label: "Alerts" },
    ],
  },
  {
    id: "product",
    label: "Product",
    root: "product",
    items: [
      { slug: "product/ideas", label: "Ideas" },
      { slug: "product/features", label: "Features" },
      { slug: "product/feedback", label: "Feedback" },
    ],
  },
  {
    id: "market",
    label: "Market",
    root: "market",
    items: [
      { slug: "market/persona", label: "Persona" },
      { slug: "market/problems", label: "Problems" },
      { slug: "market/competitors", label: "Competitors" },
      { slug: "market/surveys", label: "Surveys" },
    ],
  },
  {
    id: "channels",
    label: "Channels",
    root: "channels",
    items: [
      { slug: "channels/landing", label: "Landing" },
      { slug: "channels/social", label: "Social" },
      { slug: "channels/messaging", label: "Messaging" },
    ],
  },
  {
    id: "business",
    label: "Business",
    root: "business",
    items: [
      { slug: "business/finance", label: "Finance" },
      { slug: "business/legal", label: "Legal" },
      { slug: "business/agenda", label: "Agenda" },
      { slug: "business/kpis", label: "KPIs" },
    ],
  },
  {
    id: "team",
    label: "Team",
    root: "team",
    items: [
      { slug: "team/members", label: "Members" },
      { slug: "team/agents", label: "Agents" },
      { slug: "team/roles", label: "Roles" },
      { slug: "team/chatroom", label: "Chatroom" },
    ],
  },
  {
    id: "agent",
    label: "Agent",
    root: "agent",
    items: [
      { slug: "agent/config", label: "Config" },
      { slug: "agent/memory", label: "Memory" },
      { slug: "agent/sessions", label: "Sessions" },
      { slug: "agent/costs", label: "Costs" },
      { slug: "agent/keys", label: "API Keys" },
      { slug: "agent/models", label: "Models" },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    root: "settings",
    items: [
      { slug: "settings/project", label: "Project Settings" },
      { slug: "settings/workflow", label: "Workflow" },
      { slug: "settings/supabase", label: "Supabase" },
      { slug: "settings/bot", label: "Bot" },
      { slug: "settings/guide", label: "Guide" },
    ],
  },
  {
    id: "temp-cockpit",
    label: "TEMP-COCKPIT",
    root: "temp-cockpit",
    items: [
      { slug: "cockpit-feat", label: "Cockpit Features" },
      { slug: "cockpit-vision", label: "Cockpit Vision" },
    ],
  },
];
