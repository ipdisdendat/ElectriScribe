/*
 Graph storage for Builder: graphs, nodes, edges, and challenges
*/

create table if not exists graphs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  kind text not null default 'working' check (kind in ('working','recipe','challenge')),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
alter table graphs enable row level security;
create policy "graphs_read_own" on graphs for select to authenticated using (auth.uid() = user_id);
create policy "graphs_insert_own" on graphs for insert to authenticated with check (auth.uid() = user_id);

create table if not exists graph_nodes (
  id uuid primary key default uuid_generate_v4(),
  graph_id uuid references graphs(id) on delete cascade,
  node_key text not null, -- node instance id used on canvas
  type text not null,
  state jsonb not null default '{}'::jsonb,
  x numeric,
  y numeric
);
alter table graph_nodes enable row level security;
create policy "graph_nodes_read_own" on graph_nodes for select to authenticated using (graph_id in (select id from graphs where user_id = auth.uid()));
create policy "graph_nodes_insert_own" on graph_nodes for insert to authenticated with check (graph_id in (select id from graphs where user_id = auth.uid()));

create table if not exists graph_edges (
  id uuid primary key default uuid_generate_v4(),
  graph_id uuid references graphs(id) on delete cascade,
  from_node_key text not null,
  from_port text not null,
  to_node_key text not null,
  to_port text not null
);
alter table graph_edges enable row level security;
create policy "graph_edges_read_own" on graph_edges for select to authenticated using (graph_id in (select id from graphs where user_id = auth.uid()));
create policy "graph_edges_insert_own" on graph_edges for insert to authenticated with check (graph_id in (select id from graphs where user_id = auth.uid()));

-- Optional challenges table referencing a graph
create table if not exists challenges (
  id uuid primary key default uuid_generate_v4(),
  graph_id uuid references graphs(id) on delete cascade,
  name text not null,
  rubric jsonb default '{}'::jsonb,
  target_outcomes jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
alter table challenges enable row level security;
create policy "challenges_read" on challenges for select to authenticated using (true);

