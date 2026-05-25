-- BootRise workspace core (run in Supabase SQL Editor for project kymxllrauprmlyqdskic)
-- No pgvector required — safe to run on a fresh or shared Supabase project.

create table if not exists bootrise_workspace_projects (
  id text primary key,
  name text not null,
  brief jsonb not null default '{}'::jsonb,
  files jsonb not null default '[]'::jsonb,
  last_report jsonb,
  preferred_provider text not null default 'bootrise'
    check (preferred_provider in ('bootrise', 'openai')),
  github_url text,
  file_count integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_bootrise_workspace_projects_updated
  on bootrise_workspace_projects (updated_at desc);

create table if not exists bootrise_admin_telemetry (
  id text primary key,
  user_id text not null,
  project_id text not null,
  session_id text not null,
  planning_duration_ms integer not null,
  execution_duration_ms integer not null,
  verification_duration_ms integer not null,
  self_healing_attempts_count integer not null default 0,
  final_outcome text not null check (final_outcome in ('COMMITTED', 'ABANDONED', 'HARD_CRASH')),
  stalling_error_logs text,
  token_compute_cost numeric(10, 4) not null default 0.0000,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_bootrise_admin_telemetry_metrics
  on bootrise_admin_telemetry (final_outcome, created_at desc);

create index if not exists idx_bootrise_admin_telemetry_project_time
  on bootrise_admin_telemetry (project_id, created_at desc);
