create extension if not exists vector;

create table if not exists bootrise_symbols (
  id uuid primary key default gen_random_uuid(),
  repository_id text not null,
  symbol_name text not null,
  symbol_kind text not null,
  file_path text not null,
  export_dependencies jsonb default '[]'::jsonb,
  ast_node_data jsonb not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_symbols_dependencies on bootrise_symbols using gin (export_dependencies);
create index if not exists idx_symbols_lookup on bootrise_symbols (repository_id, file_path);
create index if not exists idx_symbols_name_lookup on bootrise_symbols (repository_id, symbol_name);
create unique index if not exists idx_symbols_unique_identity on bootrise_symbols (repository_id, symbol_name, file_path);

create table if not exists bootrise_epistemic_ledger (
  id uuid primary key default gen_random_uuid(),
  repository_id text not null,
  symbol_name text not null,
  file_path text not null,
  architectural_intent text not null,
  rules text[] default '{}'::text[],
  scar_tissue text[] default '{}'::text[],
  embedding vector(1536),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_epistemic_symbol_lookup on bootrise_epistemic_ledger (repository_id, symbol_name);
create unique index if not exists idx_epistemic_unique_identity on bootrise_epistemic_ledger (repository_id, symbol_name, file_path);

create table if not exists bootrise_sandbox_runs (
  id uuid primary key default gen_random_uuid(),
  plan_id text not null,
  repository_id text not null,
  status text not null,
  terminal_logs text not null,
  modified_files text[] not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_sandbox_runs_plan on bootrise_sandbox_runs (plan_id);

create table if not exists bootrise_dynamic_pulses (
  id uuid primary key default gen_random_uuid(),
  repository_id text not null,
  source text not null,
  severity text not null,
  summary text not null,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_dynamic_pulses_repo_time on bootrise_dynamic_pulses (repository_id, created_at desc);

create table if not exists bootrise_self_healing_attempts (
  id text primary key,
  plan_id text not null,
  repository_id text not null,
  failed_run_id text not null,
  diagnosis text not null,
  proposed_actions jsonb not null default '[]'::jsonb,
  status text not null check (status in ('proposed', 'applied', 'abandoned')),
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists rollback_snapshots (
  id text primary key,
  execution_id text not null,
  plan_id text not null,
  repository_id text not null,
  changed_files jsonb not null,
  restore_notes text not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists project_blueprints (
  id text primary key,
  name text not null,
  product_type text not null,
  audience text not null,
  core_entities jsonb not null default '[]'::jsonb,
  pages jsonb not null default '[]'::jsonb,
  database_tables jsonb not null default '[]'::jsonb,
  security_rules jsonb not null default '[]'::jsonb,
  test_plan jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);
