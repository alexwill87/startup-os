# VISION — Project OS / Radar Cockpit

> Document de référence gravé le 7 avril 2026.
> Ce document définit la vision, les rôles, le plan d'action et les décisions prises.

---

## La Vision

Project OS est un **cockpit de startup** qui permet à chaque membre d'une équipe — cofondateurs, mentors, observateurs — de :

1. **Savoir quoi faire** — chaque rôle a son dashboard personnalisé
2. **Voir ce que chacun fait** — checklist, tâches, activité visible par tous
3. **Prendre des décisions ensemble** — votes, validation à 2 personnes, points de vue structurés
4. **Être aidé par des agents IA** — un bot Telegram qui observe, vérifie, alerte et facilite
5. **Accueillir différents profils** — cofondateurs avec contrôle total, mentors en lecture, observateurs avec vue limitée

**Le cockpit n'est pas un outil de plus.** C'est l'endroit unique où l'équipe se retrouve, où chaque question a sa réponse, où chaque décision est traçable.

---

## Les Rôles (4 niveaux)

### 1. Admin
- **Qui :** Omar (project manager)
- **Voit :** Tout
- **Fait :** Tout + gestion des membres, config, API keys, bot
- **Dashboard :** Vue complète avec métriques de santé, alertes, gestion

### 2. Co-fondateur
- **Qui :** Alex, Abdulmalik, Loice
- **Voit :** Tout
- **Fait :** Tout sauf config sensible (API keys, bot provider)
- **Dashboard :** Mes tâches, mes décisions en attente, checklist de mon pilier, activité récente, leaderboard

### 3. Mentor
- **Qui :** Experts invités, advisors
- **Voit :** Tout (lecture seule)
- **Fait :** Commenter, répondre aux checklist items, voter sur les décisions
- **Dashboard :** Vue des piliers, décisions ouvertes (pour donner un avis), checklist items en attente de validation

### 4. Observateur
- **Qui :** Ambassadeurs, fans, prospects, clients potentiels, investisseurs curieux
- **Voit :** Why (mission, vision, stratégie) + Analytics (KPIs publics) + Feedback
- **Fait :** Soumettre du feedback, voir la progression
- **Dashboard :** La mission du projet, les KPIs clés, formulaire de feedback, progression générale

> **Chaque profil a une fiche personnalisée** dans `/equipe/profile` avec ses infos, son rôle, ses contributions.

---

## L'Agent (Bot Telegram)

Le bot @RadarPMBot est **le seul agent actif** pour le moment. Il fonctionne via un webhook sur `/api/telegram`.

### Ce qu'il fait aujourd'hui
- `/start` — Message de bienvenue + chat ID
- `/task [titre]` — Crée une tâche dans le board
- `/summary` — Résumé du projet (tâches, décisions, équipe, KPIs)
- Texte libre — Réponse IA contextuelle (avec données du projet)
- Notifications automatiques sur chaque action dans le cockpit

### Ce qu'il doit devenir (J4)
- `/checklist` — Voir les items en cours par pilier
- `/decision [titre]` — Proposer une décision
- `/status` — Résumé rapide par pilier (% complétion)
- **Observateur** : détecter les items bloqués 3+ jours, builders inactifs, décisions non résolues → alerte automatique
- **Commentateur** : pouvoir commenter sur n'importe quel item via Telegram
- **Gateway d'approbation** : pour les actions irréversibles, demander confirmation via bouton inline

### Ce qu'il n'est PAS (pour l'instant)
- Pas un agent autonome qui prend des décisions
- Pas "Athena" — la page `/athena` est un dashboard de checks automatisés, pas un agent

---

## État Actuel (7 avril 2026)

### Ce qui existe et fonctionne
- 58 routes compilées, 0 erreurs
- 17 tables Supabase avec RLS
- Auth magic link, Realtime sur toutes les tables
- Checklist 76 items (source de vérité manuelle)
- Kanban, Décisions, Objectifs, Retro, KPIs, Feedback, Leaderboard
- Bot Telegram multi-provider (OpenRouter/Anthropic/Mistral)
- File upload avec compression auto
- Activité en temps réel

### Ce qui n'existe PAS encore
- **Aucun vrai contenu** — tout est seed data ou vide
- **Aucun rôle appliqué** — tout le monde a accès à tout
- **Aucun dashboard personnalisé par rôle** — tout le monde voit la même Home
- **Le bot n'écrit pas dans la checklist** et ne peut pas observer/alerter
- **Pas de daily summary automatique**

---

## Plan d'Action — J4 "Intelligence"

### Phase 1 — Consolider (7-12 avril, Sprint 2)
> L'équipe ouvre le cockpit et sait quoi faire.

- [ ] **1.1** Supprimer les routes dupliquées (anciennes routes plates)
- [ ] **1.2** Supprimer `ALLOWED_EMAILS` et `BUILDERS` hardcodé — tout depuis `cockpit_members`
- [ ] **1.3** Simplifier les rôles à 4 niveaux (admin, cofounder, mentor, observer)
- [ ] **1.4** Home = dashboard actionnable (différent par rôle)
- [ ] **1.5** Nettoyer le seed data
- [ ] **1.6** Vérifier et documenter le fonctionnement actuel du bot

### Phase 2 — Connecter (12-19 avril, Sprint 3)
> Les workflows se parlent entre eux.

- [ ] **2.1** Objectifs validés → génèrent des tâches automatiquement
- [ ] **2.2** Checklist item = fiche complète (réponses, fichiers, discussions)
- [ ] **2.3** Bot enrichi : `/checklist`, `/decision`, `/status`
- [ ] **2.4** Bot observateur : alertes sur items bloqués, builders inactifs

### Phase 3 — Briller (19-26 avril, Sprint 4, Demo Day)
> Le cockpit impressionne.

- [ ] **3.1** Daily summary Telegram (cron automatique)
- [ ] **3.2** Leaderboard dans la Home
- [ ] **3.3** CSS polish + responsive
- [ ] **3.4** Dashboards personnalisés finalisés pour chaque rôle

---

## Décisions Prises

| # | Décision | Date | Par |
|---|----------|------|-----|
| D1 | 4 rôles seulement : admin, cofounder, mentor, observer | 7 avril 2026 | Omar |
| D2 | Observer = ambassadeur + fan + prospect + client (un seul rôle unifié) | 7 avril 2026 | Omar |
| D3 | Mentor = lecture seule + commentaires + votes | 7 avril 2026 | Omar |
| D4 | Chaque rôle a un dashboard personnalisé | 7 avril 2026 | Omar |
| D5 | Le bot est le seul agent actif, pas Athena | 7 avril 2026 | Omar |
| D6 | Routes dupliquées supprimées (pas de redirections, personne n'a de bookmarks) | 7 avril 2026 | Omar |
| D7 | Seed data nettoyé | 7 avril 2026 | Omar |
| D8 | On ne sur-ingénierie pas (pas de Temporal, Checkly, RAG, etc.) | 7 avril 2026 | Omar |

---

## Références

- `HANDOVER.md` — Contexte technique complet, tables, architecture
- `README.md` — Documentation publique à jour
- `Optimisation Cockpit Radar _ Prompt Deep Search.md` — Benchmark Google Deep Research (à filtrer)
- `omar-alex-vps/docs/StartupKit.md` — Framework de questions par pilier (source des 76 items)
- `RADAR/Radar_AtoZ.md` — Documentation produit Radar (1127 lignes)
