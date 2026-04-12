-- Seed: Cockpit Features OS
-- Toutes les fonctionnalités du cockpit catégorisées

INSERT INTO cockpit_features_os (name, description, category, route, status, validated_claude, created_by) VALUES

-- PRIMORDIAL
('Auth & Accès', 'Magic link login, inscription publique via /apply, gestion des rôles (admin, cofounder, mentor, observer)', 'primordial', '/auth/callback', 'a_verifier', true, 'Claude'),
('Home Dashboard', 'Vue des 7 piliers avec % de complétion, activité récente, tâches en cours', 'primordial', '/', 'a_verifier', true, 'Claude'),
('Navigation & Sidebar', 'Menu structuré par pilier, accès par rôle, logo et nom du projet dynamiques', 'primordial', NULL, 'a_verifier', true, 'Claude'),
('Équipe & Membres', 'Inviter par email, assigner des rôles, voir les profils, gérer les accès', 'primordial', '/equipe/members', 'a_verifier', true, 'Claude'),
('Décisions & Votes', 'Proposer une décision, voter agree/disagree/neutral, consensus automatique, commentaires', 'primordial', '/pourquoi/decisions', 'a_verifier', true, 'Claude'),
('Tâches / Board', 'Kanban avec drag & drop, assignation, priorités, sprints, vue Gantt, subtasks', 'primordial', '/projet/tasks', 'a_verifier', true, 'Claude'),
('Activité', 'Flux temps réel de toutes les actions dans le cockpit, filtrable par type', 'primordial', '/activity', 'a_verifier', true, 'Claude'),
('Feedback', 'Widget sur chaque page + page dédiée, soumettre bugs/idées, voter, statuts admin', 'primordial', '/feedback', 'a_verifier', true, 'Claude'),

-- NECESSAIRE
('Vision & Mission', 'Définir mission, vision, problème, north star metric. Voter sur le consensus de l''équipe', 'necessaire', '/pourquoi/mission', 'a_verifier', true, 'Claude'),
('Goals par pilier', 'Jusqu''à 3 goals par pilier, voting 2/3 pour valider, assigner Lead/Controller/Agent', 'necessaire', '/objectives', 'a_verifier', true, 'Claude'),
('Checklist', '76 items de progression par phase, source de vérité manuelle pour la complétion', 'necessaire', '/setup/checklist', 'a_verifier', true, 'Claude'),
('Documentation', '17 chapitres liés à la checklist, organisation par pilier', 'necessaire', '/projet/docs', 'a_verifier', true, 'Claude'),
('Bot Telegram', 'Notifications temps réel, /task pour créer, /summary pour résumer, texte libre IA', 'necessaire', '/setup/bot', 'a_verifier', true, 'Claude'),
('AI Chatbot', 'Assistant in-app qui lit le projet et écrit en DB (profil, tâches, goals, décisions, vision)', 'necessaire', NULL, 'a_verifier', true, 'Claude'),
('Profils publics', 'Page publique par membre avec bio, rôle, activité, contributions', 'necessaire', '/equipe/profile', 'a_verifier', true, 'Claude'),
('Landing page', 'Vitrine publique dynamique, contenu depuis la DB, feature cards, login, apply', 'necessaire', NULL, 'a_verifier', true, 'Claude'),
('Features pipeline', 'Proposer, voter (2/3), build, control, deploy — pipeline complet avec AI Suggest', 'necessaire', '/projet/features', 'a_verifier', true, 'Claude'),

-- UTILE
('Roadmap', 'Jalons J1-J5 avec sprints, KPI targets, progression par phase', 'utile', '/projet/roadmap', 'a_verifier', true, 'Claude'),
('Leaderboard', 'Classement des membres par activité, gamification, filtrable par période', 'utile', '/leaderboard', 'a_verifier', true, 'Claude'),
('Resources (liens, fichiers)', 'Bookmarks catégorisés, upload fichiers avec metadata, galerie images', 'utile', '/ressources/links', 'a_verifier', true, 'Claude'),
('KPIs & Analytics', 'Métriques avec min/stretch targets, alertes automatiques, score santé projet', 'utile', '/analytics/kpis', 'a_verifier', true, 'Claude'),
('Athena QA', 'Score qualité automatique sur 6 critères (utilité, complétude, fluidité, etc.)', 'utile', '/athena', 'a_verifier', true, 'Claude'),
('Strategy Notes', 'Notes par topic (product, market, tech, pitch, monetization, growth)', 'utile', '/pourquoi/vision-strategy', 'a_verifier', true, 'Claude'),
('Market (personas, competitors)', 'Définir les personas cibles, analyser la concurrence, organiser le feedback utilisateur', 'utile', '/clients/personas', 'a_verifier', true, 'Claude'),
('Finances', 'Budget tracking, suivi des coûts API, projections de revenus et MRR', 'utile', '/finances/budget-track', 'a_verifier', true, 'Claude'),

-- BROUILLON
('Retro', 'Rétrospective sprint Keep/Stop/Try — page stub minimale', 'brouillon', '/projet/retro', 'reflexion', true, 'Claude'),
('Workflow', '11 étapes configurables par feature — page stub minimale', 'brouillon', '/projet/workflow', 'reflexion', true, 'Claude'),
('Find (AI discover)', 'Découverte de features par IA, méga prompt, upload JSON — page stub', 'brouillon', '/projet/find', 'reflexion', true, 'Claude'),
('Tools directory', 'Inventaire des outils et APIs utilisés — page basique', 'brouillon', '/ressources/tools', 'reflexion', true, 'Claude'),
('Roles page', 'Définition des rôles — page stub, les rôles existent dans le code mais pas la page', 'brouillon', '/equipe/roles', 'reflexion', true, 'Claude'),
('Onboarding', 'Flow d''accueil par rôle — placeholder', 'brouillon', '/equipe/onboarding', 'reflexion', true, 'Claude'),
('Changelog', 'Historique des versions — page minimale', 'brouillon', '/setup/changelog', 'reflexion', true, 'Claude');
