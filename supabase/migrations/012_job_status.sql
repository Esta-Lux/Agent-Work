-- BootRise background job status table
-- Safe to run in Supabase SQL editor. Supports local/Inngest job monitoring.

create table if not exists bootrise_jobs (
  id text primary key,
  org_id text not null default 'org_default',
  project_id text,
  repository_id text,
  type text not null,
  status text not null default 'queued',
  payload jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_bootrise_jobs_org_created
  on bootrise_jobs (org_id, created_at desc);

create index if not exists idx_bootrise_jobs_status
  on bootrise_jobs (status);

create index if not exists idx_bootrise_jobs_type
  on bootrise_jobs (type);

comment on table bootrise_jobs is
  'Operational job status for Project Brain builds, security scans, deployment readiness, and future multi-pass/self-agent work.';
