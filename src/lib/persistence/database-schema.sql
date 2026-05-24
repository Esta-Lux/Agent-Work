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

