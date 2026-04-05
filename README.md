# Radar Cockpit

Internal dashboard for the Radar team (Abdulmalik, Alex, Loice).
Managed by Omar (OpenClaw).

## Features

- **Dashboard** — Sprint progress, builder stats, countdown
- **Board** — Kanban tasks by sprint (maps to A1-C10 from the hackathon plan)
- **Decisions** — Async debates with votes (agree/disagree/neutral)
- **Retro** — Keep / Stop / Try per sprint

## Stack

- Next.js (App Router)
- Supabase (Auth + PostgreSQL + Realtime)
- Vercel (deploy)

## Setup

### 1. Supabase

1. Create a new project at [supabase.com](https://supabase.com/dashboard)
2. Go to SQL Editor, paste and run `supabase/migrations/001_cockpit_tables.sql`
3. Go to Authentication > Settings, enable Email/Password sign-up
4. Create accounts for the 3 builders:
   - abdulmalikajibade@gmail.com
   - alexwillemetz@gmail.com
   - pokamblg@gmail.com
5. Copy the project URL and anon key

### 2. Local dev

```bash
cp .env.example .env.local
# Fill in your Supabase URL and anon key
npm install
npm run dev
```

### 3. Deploy to Vercel

1. Connect this repo to Vercel
2. Add env vars: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy

## Git Workflow

- `main` — production (protected, PR required)
- `abdulmalik` — Builder A branch
- `alex` — Builder B branch
- `loice` — Builder C branch

## Access

Restricted to 3 emails only (whitelist in `lib/supabase.js`).
