/*
  Dynamic Rules & Self-Programming Registry
  - rules_registry: versioned, enabled rules loaded at runtime
  - patch_proposals: code diffs and proposals for self-updates
  - test_cases: graph fixtures + expected outcomes
*/

-- RULES REGISTRY
create table if not exists rules_registry (
  id uuid primary key default uuid_generate_v4(),
  domain text not null,                -- e.g., 'electrical'
  node_type text,                      -- e.g., 'electrical.breaker'
  constraint text not null,            -- e.g., 'breaker_capacity'
  expression_json jsonb default '{}'::jsonb, -- optional rule expression
  params jsonb default '{}'::jsonb,    -- parameters/thresholds
  severity text default 'warning',     -- info|warning|critical
  enabled boolean default false,
  version int default 1,
  source text,                         -- proposal, human, system
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table rules_registry enable row level security;
create policy "rules_registry_read" on rules_registry for select to authenticated using (true);
create policy "rules_registry_insert_own" on rules_registry for insert to authenticated with check (auth.uid() = created_by);
create policy "rules_registry_update_own" on rules_registry for update to authenticated using (auth.uid() = created_by) with check (auth.uid() = created_by);

create index if not exists rules_registry_domain_idx on rules_registry(domain);
create index if not exists rules_registry_enabled_idx on rules_registry(enabled);
create index if not exists rules_registry_constraint_idx on rules_registry(constraint);

-- PATCH PROPOSALS
create table if not exists patch_proposals (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  diff text,                           -- unified diff or JSON patch
  status text not null default 'proposed' check (status in ('proposed','approved','rejected','merged')),
  provenance jsonb default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table patch_proposals enable row level security;
create policy "patch_proposals_read_own" on patch_proposals for select to authenticated using (created_by = auth.uid());
create policy "patch_proposals_insert_own" on patch_proposals for insert to authenticated with check (created_by = auth.uid());

-- TEST CASES
create table if not exists test_cases (
  id uuid primary key default uuid_generate_v4(),
  domain text not null,
  name text not null,
  graph jsonb not null,                -- GraphData fixture
  expected jsonb not null,             -- expected rule/validator outcomes
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

alter table test_cases enable row level security;
create policy "test_cases_read_own" on test_cases for select to authenticated using (created_by = auth.uid());
create policy "test_cases_insert_own" on test_cases for insert to authenticated with check (created_by = auth.uid());

