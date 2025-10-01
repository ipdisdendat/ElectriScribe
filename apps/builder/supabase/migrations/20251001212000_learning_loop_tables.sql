/*
  Learning Loop Tables for ElectriScribe
  - learning_events: granular telemetry
  - challenge_results: outcome summaries
  - skill_profiles: adaptive learner model
  - interventions: hint/micro-lesson policy effects
*/

create table if not exists learning_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  session_id text,
  event_type text not null,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table learning_events enable row level security;
create policy "learning_events_read_own" on learning_events for select to authenticated using (auth.uid() = user_id);
create policy "learning_events_insert_own" on learning_events for insert to authenticated with check (auth.uid() = user_id);

create table if not exists challenge_results (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  challenge_id text not null,
  passed boolean not null,
  attempts int default 1,
  duration_ms int,
  score numeric,
  details jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table challenge_results enable row level security;
create policy "challenge_results_read_own" on challenge_results for select to authenticated using (auth.uid() = user_id);
create policy "challenge_results_insert_own" on challenge_results for insert to authenticated with check (auth.uid() = user_id);

create table if not exists skill_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  skill_vector jsonb not null default '{}'::jsonb,
  last_updated timestamptz default now()
);

alter table skill_profiles enable row level security;
create policy "skill_profiles_read_own" on skill_profiles for select to authenticated using (auth.uid() = user_id);
create policy "skill_profiles_upsert_own" on skill_profiles for insert to authenticated with check (auth.uid() = user_id);
create policy "skill_profiles_update_own" on skill_profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists interventions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  type text not null, -- hint | micro_lesson | preset
  trigger text,      -- rule for when applied
  effect_metrics jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table interventions enable row level security;
create policy "interventions_read_own" on interventions for select to authenticated using (auth.uid() = user_id);
create policy "interventions_insert_own" on interventions for insert to authenticated with check (auth.uid() = user_id);

