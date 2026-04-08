# Contributing to Project OS

Thank you for your interest in contributing! Project OS is an open-source startup cockpit that any team can use. Here's how to contribute.

---

## Architecture: Platform vs Project Data

Project OS separates **platform code** (the cockpit itself) from **project data** (your startup's content).

### Platform (shared, contributed back)
Everything in the codebase:
- `app/` — Pages, components, layouts
- `lib/` — Client libraries, auth, helpers
- `supabase/migrations/` — Database schema
- `public/` — Static assets

**This is what you fork, improve, and contribute back.**

### Project Data (yours, never shared)
Everything in Supabase:
- Member profiles, roles, emails
- Goals, features, tasks content
- Vision statements, strategy notes
- API keys, bot tokens
- Activity logs, votes, comments
- Uploaded files

**This stays in your Supabase instance. It's never in the repo.**

### How the separation works

```
GitHub Repo (platform)          Supabase (project data)
├── app/                        ├── cockpit_members (YOUR team)
├── lib/                        ├── cockpit_objectives (YOUR goals)
├── supabase/migrations/        ├── cockpit_vision (YOUR vision)
├── components/                 ├── cockpit_tasks (YOUR tasks)
├── CONTRIBUTING.md             ├── cockpit_config (YOUR settings)
└── ...                         └── ... (all YOUR content)
```

When you fork Project OS:
1. You get the **platform** (code, schema, components)
2. You create your own **Supabase project** (empty)
3. You run the migrations → tables are created empty
4. You fill them with YOUR project data
5. If you improve the platform → PR back to us

---

## Getting Started

### Fork and setup
```bash
# Fork on GitHub, then:
git clone https://github.com/YOUR_USERNAME/startup-os.git
cd startup-os
npm install

# Create .env.local with YOUR Supabase credentials
cp .env.example .env.local

# Run migrations on YOUR Supabase (001 → 018, in order)
# Then:
npm run dev
```

### Create your first admin
```sql
INSERT INTO cockpit_members (email, name, role, builder, color, status)
VALUES ('you@email.com', 'Your Name', 'admin', 'A', '#3b82f6', 'active');
```

---

## How to Contribute

### 1. Report Issues
- Go to [Issues](https://github.com/alexwill87/startup-os/issues)
- Use labels: `bug`, `feature`, `enhancement`, `question`

### 2. Submit a Pull Request

```bash
# Create a branch
git checkout -b feature/my-improvement

# Make changes (see guidelines below)

# Test
npm run build  # Must compile with 0 errors

# Commit
git commit -m "Add: description of what you did"

# Push and create PR
git push origin feature/my-improvement
```

### 3. PR Guidelines

**Do:**
- Keep PRs focused (one feature or fix per PR)
- Test that `npm run build` passes with 0 errors
- Follow existing code patterns (Supabase client, Card/PageHeader components, dark theme)
- Add migrations if you change the database schema (increment the number: 019, 020, etc.)
- Use the existing auth system (`useAuth`, `useMembers`, `canEdit`)

**Don't:**
- Don't include project data (no hardcoded emails, names, API keys)
- Don't break existing migrations (add new ones, don't modify old ones)
- Don't add heavy dependencies (keep it Next.js + Supabase + Tailwind)
- Don't add `* { margin: 0 }` in CSS (Tailwind v4 has its own reset)

---

## Code Conventions

### File structure
```
app/(app)/[pillar]/[page]/page.js    — Route pages
app/components/[Name].js             — Shared components
app/api/[endpoint]/route.js          — API routes
lib/[name].js                        — Client libraries
supabase/migrations/[NNN]_name.sql   — Database migrations
```

### Component patterns
```jsx
// Every page follows this structure:
"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth, useMembers } from "@/lib/AuthProvider";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

export default function MyPage() {
  const { member, canEdit } = useAuth();
  // ...
}
```

### Database patterns
- All tables have RLS enabled
- All require `auth.uid() IS NOT NULL`
- Use `cockpit_` prefix for all tables
- Store complex metadata as JSON in `body` or `description` fields
- Log all actions to `cockpit_activity`

### Styling
- Tailwind CSS v4 (`@import "tailwindcss"`)
- Dark theme: `bg-[#0a0f1a]`, borders `#1e293b`, text `#e2e8f0` / `#94a3b8` / `#475569`
- Font sizes: `text-xs` for metadata, `text-sm` for content, `text-lg` for titles

---

## Priority Areas for Contribution

| Area | Description | Difficulty |
|------|-------------|------------|
| **i18n** | Multi-language support (FR, EN, ES, etc.) | Medium |
| **Mobile** | Responsive sidebar + pages | Medium |
| **Email notifications** | Alongside Telegram | Easy |
| **Export** | PDF reports, pitch deck generation | Medium |
| **Integrations** | Google Drive, Notion, Slack, GitHub | Hard |
| **Themes** | Custom branding, colors, logo | Easy |
| **Gantt improvements** | Drag & drop, dependencies | Hard |
| **Agent capabilities** | Auto-fill from documents, smarter suggestions | Hard |
| **Testing** | Unit tests, E2E tests | Medium |
| **Multi-project** | Support multiple projects per instance | Hard |

---

## Database Migrations

When you need to change the database schema:

1. Create a new file: `supabase/migrations/019_your_change.sql`
2. Write idempotent SQL (`IF NOT EXISTS`, `DROP CONSTRAINT IF EXISTS`)
3. Test on your own Supabase before submitting
4. Document what the migration does in comments

**Never modify existing migrations** — only add new ones.

---

## Questions?

- Open an [Issue](https://github.com/alexwill87/startup-os/issues)
- Or reach out to the team via the cockpit's Feedback page

---

Built with [Claude Code](https://claude.ai/code).
