-- BootRise readiness layer snapshots
-- Stores explicit readiness checks for sandbox, GitHub App, billing, onboarding, and provider duel.

create table if not exists bootrise_readiness_snapshots (
  id text primary key,
  org_id text not null default 'org_default',
  layer text not null,
  status text not null,
  configured boolean not null default false,
  summary text,
  missing_items text[] not null default '{}',
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_bootrise_readiness_snapshots_org_layer
  on bootrise_readiness_snapshots (org_id, layer);

create table if not exists bootrise_onboarding_state (
  org_id text primary key,
  user_id text,
  dismissed boolean not null default false,
  current_step text not null default 'connect_repo',
  completed_steps text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists bootrise_provider_duel_runs (
  id text primary key,
  org_id text not null default 'org_default',
  project_id text,
  task text not null,
  results jsonb not null default '[]'::jsonb,
  recommendation text,
  created_at timestamptz not null default now()
);

create index if not exists idx_bootrise_provider_duel_runs_org_created
  on bootrise_provider_duel_runs (org_id, created_at desc);

comment on table bootrise_readiness_snapshots is
  'Latest setup snapshots for operational readiness layers such as sandbox, GitHub App, and billing.';

comment on table bootrise_onboarding_state is
  'Workspace first-run checklist progress. Completion must be derived from real workspace state, not fake metrics.';

comment on table bootrise_provider_duel_runs is
  'Non-mutating provider comparison runs. Results are advisory only and never apply patches.';
