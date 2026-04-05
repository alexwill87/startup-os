-- ============================================
-- RADAR COCKPIT — Tables internes (privé)
-- À exécuter dans le SQL Editor de Supabase
-- ============================================

-- 1. TASKS — Kanban par sprint et builder
create table cockpit_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  sprint int2 not null check (sprint between 1 and 4),
  builder text not null check (builder in ('A','B','C')),
  status text not null default 'todo'
    check (status in ('todo','in_progress','done','blocked')),
  priority text default 'medium'
    check (priority in ('low','medium','high','critical')),
  task_ref text, -- réf vers la fiche hackathon (A1, B3, C7...)
  pr_url text,   -- lien vers la PR sur radar-foundation
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. DECISIONS — Débats async entre builders
create table cockpit_decisions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  context text,
  status text default 'open'
    check (status in ('open','decided','revisit')),
  decision text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- 3. COMMENTS — Réponses + votes sur les décisions
create table cockpit_comments (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid references cockpit_decisions(id) on delete cascade,
  body text not null,
  vote text check (vote in ('agree','disagree','neutral')),
  author_id uuid references auth.users(id),
  created_at timestamptz default now()
);

-- 4. RETRO — Points de rétrospective par sprint
create table cockpit_retro (
  id uuid primary key default gen_random_uuid(),
  sprint int2 not null check (sprint between 1 and 4),
  category text not null check (category in ('keep','stop','try')),
  body text not null,
  author_id uuid references auth.users(id),
  created_at timestamptz default now()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table cockpit_tasks enable row level security;
alter table cockpit_decisions enable row level security;
alter table cockpit_comments enable row level security;
alter table cockpit_retro enable row level security;

-- Politique : les 3 builders voient et éditent tout
-- (pas de restriction inter-builder, c'est une équipe)
create policy "builders_all" on cockpit_tasks
  for all using (auth.uid() is not null);

create policy "builders_all" on cockpit_decisions
  for all using (auth.uid() is not null);

create policy "builders_all" on cockpit_comments
  for all using (auth.uid() is not null);

create policy "builders_all" on cockpit_retro
  for all using (auth.uid() is not null);

-- ============================================
-- REALTIME — Activer pour toutes les tables
-- ============================================

alter publication supabase_realtime add table cockpit_tasks;
alter publication supabase_realtime add table cockpit_decisions;
alter publication supabase_realtime add table cockpit_comments;
alter publication supabase_realtime add table cockpit_retro;

-- ============================================
-- INDEX pour performance
-- ============================================

create index idx_tasks_sprint on cockpit_tasks(sprint);
create index idx_tasks_builder on cockpit_tasks(builder);
create index idx_tasks_status on cockpit_tasks(status);
create index idx_comments_decision on cockpit_comments(decision_id);
create index idx_retro_sprint on cockpit_retro(sprint);
