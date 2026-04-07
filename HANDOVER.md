# HANDOVER — Project OS / Radar Cockpit

> Document de passation pour tout agent Claude qui reprend ce projet.
> Dernière mise à jour : 6 avril 2026, 23h.

---

## Contexte

**Project OS** est un dashboard open-source pour équipes startup. Il est actuellement utilisé ("dogfoodé") par l'équipe **Radar** pendant le hackathon AI Tinkerers Paris (4 dimanches en avril 2026).

**Radar** = outil de monitoring de plateformes d'emploi avec alertes IA et CV taillés automatiquement. Repo public : https://github.com/abdulmalikajibadecodes/radar-foundation

**Alex** (alexwillemetz@gmail.com) est le co-fondateur qui pilote le cockpit. **Omar** est l'agent OpenClaw qui manage. Les 2 autres builders sont Abdulmalik (Backend) et Loice (Frontend).

---

## État technique

### Repos
- **Cockpit** : https://github.com/alexwill87/radar-cockpit (private)
- **Radar** : https://github.com/abdulmalikajibadecodes/radar-foundation (public)

### Live
- https://radar-cockpit.vercel.app

### Stack
- Next.js 16 (App Router)
- Tailwind CSS v4 (`@import "tailwindcss"` — NE PAS ajouter `* { margin: 0 }`, ça casse tout)
- Supabase PostgreSQL (17 tables)
- Supabase Auth (magic link, invitation only)
- Supabase Storage (bucket "project-files")
- Supabase Realtime (sur toutes les tables)
- Vercel (deploy)
- Bot Telegram (@RadarPMBot) via OpenRouter → Claude Haiku

### Supabase
- Project ref : `gesdscaawdvvmrmxlxdu`
- URL : `https://gesdscaawdvvmrmxlxdu.supabase.co`
- Service role key : dans Vercel env `SUPABASE_SERVICE_ROLE_KEY`
- Les migrations SQL sont dans `supabase/migrations/` (001 → 013)
- **IMPORTANT** : les migrations ne s'exécutent PAS automatiquement. Alex les colle manuellement dans le SQL Editor de Supabase.

### Vercel
- Compte : alexwill87
- Env vars : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Deploy : `vercel --prod --yes` depuis le repo

### Telegram Bot
- Username : @RadarPMBot
- Token : dans `cockpit_config` table (key: `telegram_bot_token`)
- Chat ID Alex : `6003197523` (dans `cockpit_config` key: `telegram_chat_id`)
- Webhook : `https://radar-cockpit.vercel.app/api/telegram`
- Utilise OpenRouter par défaut, fallback Anthropic/Mistral
- Config modifiable dans /setup/bot

---

## Architecture — 58 routes

### Sidebar
```
Home          — Vue radar, 7 piliers avec %, activité
Activity      — Flux temps réel de tout ce qui se passe
Guide         — Onboarding, explication de toutes les pages
Feedback      — Suggestions/bugs avec votes uniques
Leaderboard   — Gamification, scores par période
Objectives    — 10 goals avec validation 2 personnes
Athena QA     — Agent QA automatisé, 8 critères, score global

Why           — Pillar dashboard (checklist)
  Vision      — Mission, vision, valeurs
  Notes       — Strategy notes par topic
  Decisions   — Propositions, votes, résolution

Team          — Pillar dashboard
  Members     — Invite, rôles, login links
  Roles       — Responsabilités
  My Profile  — Bio, phone, LinkedIn, skills, URLs, timezone

Resources     — Pillar dashboard
  Links       — Bookmarks catégorisés
  Files       — Upload avec metadata
  Gallery     — Images avec lightbox + compression
  Tools       — Inventaire outils/APIs
  Budget      — Suivi coûts

Project       — Cross-pillar orchestrator
  Overview    — Tous les piliers + sprint + builders
  Board       — Kanban (sprint tasks) + Actions (checklist)
  Roadmap     — J1-J5 jalons + sprints + pillar readiness
  Docs        — Documents requis + importés
  Retro       — Keep/Stop/Try

Market        — Pillar dashboard
  Personas    — Profils utilisateurs cibles
  Competitors — Analyse concurrence
  Feedback    — Feedback utilisateurs

Finances      — Pillar dashboard
  Budget      — Dépenses mensuelles
  Costs       — Projections coûts API
  Revenue     — MRR, targets

Analytics     — Pillar dashboard
  KPIs        — Métriques min/stretch, historique
  Alerts      — Checks automatiques
  Health      — Score santé par pilier

Config
  Checklist   — Onboarding 7 phases
  Settings    — Projet + Telegram
  API Keys    — Vault sécurisé (OpenRouter, Anthropic, Mistral)
  Bot         — Choix provider/modèle, capabilities
  Roadmap OS  — Roadmap du dashboard lui-même
  Changelog   — Ce qui a été construit
```

### Tables Supabase (17)
```
cockpit_tasks              — Tâches kanban par sprint
cockpit_decisions          — Propositions avec votes
cockpit_comments           — Commentaires sur les décisions
cockpit_docs               — Documentation (17 chapitres importés)
cockpit_kpis               — Métriques Demo Day
cockpit_resources          — Liens, outils, docs partagés
cockpit_vision             — Notes de stratégie par topic
cockpit_retro              — Keep/Stop/Try par sprint
cockpit_members            — Membres dynamiques (remplace whitelist)
cockpit_activity           — Log de toutes les actions
cockpit_config             — Key-value config (bot token, etc.)
cockpit_api_keys           — Vault de clés API (masquées)
cockpit_files              — Metadata des fichiers uploadés
cockpit_checklist          — 76 items par pilier (source de vérité)
cockpit_responses          — Réponses collaboratives par item
cockpit_feedback           — Suggestions/bugs avec votes
cockpit_votes              — Votes uniques (1 par personne par item)
cockpit_objectives         — 10 objectifs projet
cockpit_objective_validations — Validations des objectifs (2 requis)
```

---

## Décisions techniques importantes

1. **La checklist est la source de vérité** — pas les pages de contenu. Un item est "done" uniquement quand quelqu'un le marque manuellement.

2. **Pas d'auto-sync** — on a tenté de synchroniser automatiquement les pages de contenu avec la checklist, ça marquait tout à 58% alors que rien n'était fait. Désactivé. `lib/sync-checklist.js` est un no-op.

3. **BUILDERS est un objet, pas un array** — dans `lib/supabase.js`, `BUILDERS = { email: {...} }`. Utiliser `Object.values(BUILDERS)` pour itérer. Trois pages crashaient à cause de `BUILDERS.map()`.

4. **Tailwind v4 + reset CSS** — NE JAMAIS ajouter `* { margin: 0; padding: 0; }` dans globals.css. Tailwind v4 a son propre reset (preflight). Un reset supplémentaire écrase les utility classes et tout se colle.

5. **Les rôles sont extensibles** — cockpit_members supporte : admin, cofounder, mentor, contributor, ambassador, prospect, fan, member, viewer. Le champ `builder` accepte A-J.

6. **Le bot utilise la config DB** — pas des env vars pour le token/chat ID. Modifiable dans /setup/config et /setup/bot.

---

## Jalons

| Jalon | Status | Description |
|-------|--------|-------------|
| J1 — Foundation | DONE | Supabase, Auth, Deploy, 53 routes |
| J2 — Structure | DONE | 76 checklist items, pillar dashboards, activity |
| J3 — Connection | DONE | Board ↔ checklist, Docs ↔ checklist, Overview cross-pilier |
| J4 — Intelligence | NEXT | Voir TODO ci-dessous |
| J5 — Polish | PLANNED | CSS, export, themes, open-source |

---

## TODO — ce qui reste à faire

### Priorité haute (J4)
- [ ] Objectifs validés → génèrent auto des missions dans les piliers
- [ ] Chaque checklist item = fiche complète (réponses, fichiers, discussions intégrés)
- [ ] Rôles effectifs (mentor = lecture seule, fan = Why seulement, etc.)
- [ ] Bot qui modifie des checklist items
- [ ] Daily summary Telegram (cron)
- [ ] Leaderboard intégré dans la Home

### Priorité moyenne (J5)
- [ ] CSS polish (spacing encore inégal sur certaines pages)
- [ ] Modes de vue : table, galerie, kanban sur les checklists
- [ ] Export PDF / pitch deck auto
- [ ] Multi-projet support
- [ ] Google Drive integration (lien par pilier)
- [ ] Notifications in-app

### Bugs connus
- [ ] Certaines pages ont du contenu seed qui n'est pas du vrai travail
- [ ] Le champ `builder` dans cockpit_members n'accepte que A-J (Athena a été enregistrée sans builder)
- [ ] Les anciens routes (/board, /docs, /vision etc.) coexistent avec les nouvelles (/projet/board, etc.)
- [ ] L'API key Anthropic d'Alex n'a plus de crédits — OpenRouter est utilisé

### Référence
- `omar-alex-vps/docs/StartupKit.md` — le framework de questions par pilier (source des 76 checklist items)
- `RADAR/Radar_AtoZ.md` — la documentation produit complète de Radar (1127 lignes)

---

## Comment déployer

```bash
cd /home/omar/RADAR/radar-cockpit
npm run build          # Vérifier que ça compile
git add -A && git commit -m "description"
git push origin main
vercel --prod --yes    # Deploy sur Vercel
```

Pour les nouvelles tables : écrire le SQL dans `supabase/migrations/`, puis demander à Alex de le coller dans le SQL Editor de Supabase.

---

## Contacts

- **Alex** (alexwillemetz@gmail.com) — co-fondateur, admin, teste tout en live
- **Omar** — agent OpenClaw, manage le projet
- **Athena** (athena@project-os.ai) — agent QA, membre virtuel dans cockpit_members
- **@RadarPMBot** — bot Telegram, webhook sur /api/telegram