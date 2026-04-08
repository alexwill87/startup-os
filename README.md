# Radar Cockpit

**The back-office and strategy dashboard for [Radar](https://github.com/abdulmalikajibadecodes/radar-development)** — powered by [Startup OS](https://github.com/alexwill87/startup-os).

Radar monitors job platforms and sends AI-powered alerts with tailored CVs. This cockpit is where the team defines the vision, votes on features, tracks execution, and coordinates with mentors, investors, and early users.

> **Live:** https://radar-cockpit.vercel.app
> **Startup OS (open-source upstream):** https://github.com/alexwill87/startup-os

---

## What is this?

This repo is a **dedicated instance** of [Startup OS](https://github.com/alexwill87/startup-os) for the Radar project. It serves as:

- **Strategy hub** — Vision, goals, and decisions for Radar
- **Feature pipeline** — Propose, vote, build, and deploy features with AI agents
- **Team coordination** — Cofounders, mentors, investors, and early users in one place
- **Execution tracker** — Tasks, workflow, Gantt, KPIs, retrospectives

Improvements made here can be contributed back to Startup OS. Improvements from the Startup OS community can be pulled in.

---

## The Radar Team

### Co-founders
The core builders. Full access to everything — propose features, vote, assign tasks, build and deploy.

- **Alex** — AI / Product / Claude API
- **Abdulmalik** — Backend / Infra / DB
- **Loice** — Frontend / React / UX

### Project Manager
- **Omar** (OpenClaw) — Admin, coordinates the team, manages the cockpit

### AI Agents
- **Telegram Bot** (@RadarPMBot) — Notifications, task creation, project summaries
- **In-app Assistant** — Context-aware AI that fills forms, generates ideas, answers questions
- **Claude Code** — External agent that develops and deploys features

---

## How We Work

### 1. Define Goals
Each of the 7 pillars (Purpose, Team, Resources, Product, Market, Finances, Analytics) has up to 3 goals. Each goal requires **2/3 majority** to lock. Every goal has a **Lead**, a **Controller**, and an **Agent**.

### 2. Propose Features
Anyone on the team proposes features. AI helps fill the description, KPI, prompt, and checklist. The team votes — **2/3 must agree** before a feature can be built.

### 3. Build with Workflow
Every feature follows a workflow: Preparation → Research → Debate → Definition → Build → Test → Review → Launch. Tasks are assigned to **people or AI agents**.

### 4. Control and Deploy
After building, the team validates. A **configurable threshold** (default 66%) must confirm the feature works as expected before it's marked as deployed.

---

## For Mentors

Mentors have **read-only access** to the full project. You can:
- Comment on goals and vision statements (agree / disagree / neutral)
- Validate objectives with your expertise
- Participate in feature debates
- Review the team's strategy notes

**To join as mentor:** Contact the team or fill the application form (see below).

---

## For Investors & Observers

Observers see the **Purpose** (mission, vision, goals) and **Analytics** (KPIs, health score). You can:
- Follow the project's progress in real-time
- See validated goals and feature pipeline status
- Submit feedback and feature suggestions
- View the team's public profiles

**To join as observer:** Contact the team or fill the application form (see below).

---

## Join the Project

Want to get involved? We welcome:

| Role | What you'll do | How to apply |
|------|---------------|-------------|
| **Co-founder** | Build Radar full-time | Reach out to the team directly |
| **Mentor** | Advise on strategy, review goals, challenge assumptions | Fill the [application form](https://radar-cockpit.vercel.app/apply) |
| **Investor / Observer** | Follow progress, give feedback, explore the product | Fill the [application form](https://radar-cockpit.vercel.app/apply) |

Once approved, you'll receive a **magic link** by email to access the cockpit with the right permissions.

---

## Roadmap

### Now (Sprint 2 — April 2026)
- [ ] Define vision and lock the first goals
- [ ] Propose and validate the core Radar features
- [ ] Complete team profiles and onboarding
- [ ] Test the AI agent workflow (propose → vote → build → control)

### Next (Sprint 3)
- [ ] First features built and deployed via the pipeline
- [ ] Invite mentors and collect their input
- [ ] KPIs tracking active
- [ ] Retrospective on workflow effectiveness

### Later (Sprint 4 — Demo Day)
- [ ] All key features validated and deployed
- [ ] Pitch deck generated from cockpit data
- [ ] Investor observers onboarded
- [ ] Public demo of the full pipeline

---

## Tech

Built on [Startup OS](https://github.com/alexwill87/startup-os) — Next.js 16, Supabase, Tailwind CSS v4, Vercel.

See the [Startup OS README](https://github.com/alexwill87/startup-os) for full technical documentation.

---

## Links

- **Radar Product:** https://github.com/abdulmalikajibadecodes/radar-development
- **Cockpit (this):** https://github.com/alexwill87/radar-cockpit
- **Startup OS (upstream):** https://github.com/alexwill87/startup-os
- **Live Dashboard:** https://radar-cockpit.vercel.app
