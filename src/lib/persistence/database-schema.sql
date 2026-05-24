create table repositories (
  id text primary key,
  name text not null,
  source text not null check (source in ('demo', 'uploaded', 'github', 'local')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table repo_snapshots (
  id text primary key,
  repository_id text not null references repositories(id) on delete cascade,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create table architecture_memory (
  id text primary key,
  repository_id text not null references repositories(id) on delete cascade,
  title text not null,
  rationale text not null,
  constraints jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table plans (
  id text primary key,
  repository_id text not null references repositories(id) on delete cascade,
  plan jsonb not null,
  status text not null check (status in ('draft', 'approved', 'rejected', 'executed')),
  created_at timestamptz not null default now()
);

create table diff_previews (
  id text primary key,
  plan_id text not null references plans(id) on delete cascade,
  preview jsonb not null,
  created_at timestamptz not null default now()
);

create table executions (
  id text primary key,
  plan_id text not null references plans(id) on delete cascade,
  result jsonb not null,
  created_at timestamptz not null default now()
);

create table verification_results (
  id text primary key,
  plan_id text not null references plans(id) on delete cascade,
  checks jsonb not null,
  created_at timestamptz not null default now()
);

create table preview_projects (
  id text primary key,
  plan_id text not null references plans(id) on delete cascade,
  preview jsonb not null,
  created_at timestamptz not null default now()
);

create table rollback_snapshots (
  id text primary key,
  execution_id text not null references executions(id) on delete cascade,
  changed_files jsonb not null,
  restore_notes text not null,
  created_at timestamptz not null default now()
);

create table project_blueprints (
  id text primary key,
  name text not null,
  product_type text not null,
  audience text not null,
  core_entities jsonb not null default '[]'::jsonb,
  pages jsonb not null default '[]'::jsonb,
  database_tables jsonb not null default '[]'::jsonb,
  security_rules jsonb not null default '[]'::jsonb,
  test_plan jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create extension if not exists vector;

create table bootrise_symbols (
  id uuid primary key default gen_random_uuid(),
  repository_id text not null,
  symbol_name text not null,
  symbol_kind text not null,
  file_path text not null,
  export_dependencies jsonb default '[]'::jsonb,
  ast_node_data jsonb not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index idx_symbols_dependencies on bootrise_symbols using gin (export_dependencies);
create index idx_symbols_lookup on bootrise_symbols (repository_id, file_path);
create index idx_symbols_name_lookup on bootrise_symbols (repository_id, symbol_name);
create unique index idx_symbols_unique_identity on bootrise_symbols (repository_id, symbol_name, file_path);

create table bootrise_epistemic_ledger (
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

create index idx_epistemic_symbol_lookup on bootrise_epistemic_ledger (repository_id, symbol_name);
create unique index idx_epistemic_unique_identity on bootrise_epistemic_ledger (repository_id, symbol_name, file_path);

create table bootrise_sandbox_runs (
  id uuid primary key default gen_random_uuid(),
  plan_id text not null,
  repository_id text not null,
  status text not null,
  terminal_logs text not null,
  modified_files text[] not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index idx_sandbox_runs_plan on bootrise_sandbox_runs (plan_id);

create table bootrise_dynamic_pulses (
  id uuid primary key default gen_random_uuid(),
  repository_id text not null,
  source text not null,
  severity text not null,
  summary text not null,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index idx_dynamic_pulses_repo_time on bootrise_dynamic_pulses (repository_id, created_at desc);

create table bootrise_self_healing_attempts (
  id text primary key,
  plan_id text not null,
  repository_id text not null,
  failed_run_id text not null,
  diagnosis text not null,
  proposed_actions jsonb not null default '[]'::jsonb,
  status text not null check (status in ('proposed', 'applied', 'abandoned')),
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- Recursive blast-radius query template:
-- with recursive blast_radius as (
--   select symbol_name, file_path, export_dependencies
--   from bootrise_symbols
--   where repository_id = :repository_id and symbol_name = :symbol_name
--   union
--   select s.symbol_name, s.file_path, s.export_dependencies
--   from bootrise_symbols s
--   inner join blast_radius b on s.export_dependencies @> jsonb_build_array(b.symbol_name)
--   where s.repository_id = :repository_id
-- )
-- select * from blast_radius;
