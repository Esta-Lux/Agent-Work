create extension if not exists vector;

create table if not exists verity_symbols (
  id uuid primary key default gen_random_uuid(),
  repository_id text not null,
  symbol_name text not null,
  symbol_kind text not null,
  file_path text not null,
  export_dependencies jsonb default '[]'::jsonb,
  ast_node_data jsonb not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_symbols_dependencies on verity_symbols using gin (export_dependencies);
create index if not exists idx_symbols_lookup on verity_symbols (repository_id, file_path);
create index if not exists idx_symbols_name_lookup on verity_symbols (repository_id, symbol_name);

create table if not exists verity_epistemic_ledger (
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

create index if not exists idx_epistemic_symbol_lookup on verity_epistemic_ledger (repository_id, symbol_name);

create table if not exists verity_sandbox_runs (
  id uuid primary key default gen_random_uuid(),
  plan_id text not null,
  repository_id text not null,
  status text not null,
  terminal_logs text not null,
  modified_files text[] not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_sandbox_runs_plan on verity_sandbox_runs (plan_id);

create table if not exists verity_dynamic_pulses (
  id uuid primary key default gen_random_uuid(),
  repository_id text not null,
  source text not null,
  severity text not null,
  summary text not null,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_dynamic_pulses_repo_time on verity_dynamic_pulses (repository_id, created_at desc);

