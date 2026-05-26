-- BootRise Phase 3+ — multi-tenant orgs, cloud ledger, pending fixes, audit (SOC2-ready RLS)
-- Run after 001_living_ledger.sql and 002_workspace_core.sql

-- ─── Organizations ───────────────────────────────────────────────────────────

create table if not exists bootrise_organizations (
  id text primary key,
  name text not null,
  slug text not null unique,
  plan text not null default 'team' check (plan in ('starter', 'team', 'enterprise')),
  created_at timestamptz not null default timezone('utc'::text, now())
);

insert into bootrise_organizations (id, name, slug, plan)
values ('org_default', 'Default Organization', 'default', 'team')
on conflict (id) do nothing;

create table if not exists bootrise_org_members (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references bootrise_organizations(id) on delete cascade,
  user_id text not null,
  role text not null default 'member'
    check (role in ('owner', 'admin', 'member', 'viewer')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique (org_id, user_id)
);

create index if not exists idx_bootrise_org_members_user on bootrise_org_members (user_id);

insert into bootrise_org_members (org_id, user_id, role)
values ('org_default', 'bootrise-system', 'owner')
on conflict do nothing;

-- Scope workspace projects to org
alter table bootrise_workspace_projects
  add column if not exists org_id text references bootrise_organizations(id);

update bootrise_workspace_projects
set org_id = 'org_default'
where org_id is null;

create index if not exists idx_bootrise_workspace_projects_org
  on bootrise_workspace_projects (org_id, updated_at desc);

-- ─── Living Ledger (cloud timeline) ────────────────────────────────────────────

create table if not exists bootrise_living_ledger_events (
  id text primary key,
  org_id text not null references bootrise_organizations(id) on delete cascade,
  project_id text not null,
  kind text not null check (kind in (
    'import', 'analyze', 'fix_proposed', 'fix_approved', 'fix_rejected',
    'sandbox', 'preview', 'export', 'github_push', 'chat', 'stream'
  )),
  title text not null,
  narrative text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_bootrise_ledger_org_project_time
  on bootrise_living_ledger_events (org_id, project_id, created_at desc);

-- ─── Pending fixes (survives restart, multi-tenant) ──────────────────────────

create table if not exists bootrise_pending_fixes (
  id text primary key,
  org_id text not null references bootrise_organizations(id) on delete cascade,
  project_id text,
  repository_id text not null,
  status text not null check (status in ('pending_approval', 'approved', 'rejected')),
  request text not null,
  plan jsonb not null,
  patches jsonb not null default '[]'::jsonb,
  files_snapshot jsonb not null default '[]'::jsonb,
  provider text not null default 'bootrise',
  planner_source text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  resolved_at timestamptz
);

create index if not exists idx_bootrise_pending_fixes_org_status
  on bootrise_pending_fixes (org_id, status, created_at desc);

-- ─── Audit events (SOC2 trail) ───────────────────────────────────────────────

create table if not exists bootrise_audit_events (
  id text primary key,
  org_id text not null references bootrise_organizations(id) on delete cascade,
  actor text not null,
  action text not null,
  detail text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_bootrise_audit_org_time
  on bootrise_audit_events (org_id, created_at desc);

-- ─── Row Level Security ──────────────────────────────────────────────────────

alter table bootrise_organizations enable row level security;
alter table bootrise_org_members enable row level security;
alter table bootrise_workspace_projects enable row level security;
alter table bootrise_living_ledger_events enable row level security;
alter table bootrise_pending_fixes enable row level security;
alter table bootrise_audit_events enable row level security;
alter table bootrise_admin_telemetry enable row level security;

-- Service role bypasses RLS. Authenticated users scoped by org membership.

create or replace function bootrise_user_org_ids()
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  select org_id from bootrise_org_members
  where user_id = coalesce(auth.jwt() ->> 'sub', auth.uid()::text, '');
$$;

drop policy if exists bootrise_org_select on bootrise_organizations;
create policy bootrise_org_select on bootrise_organizations
  for select using (id in (select bootrise_user_org_ids()));

drop policy if exists bootrise_members_select on bootrise_org_members;
create policy bootrise_members_select on bootrise_org_members
  for select using (org_id in (select bootrise_user_org_ids()));

drop policy if exists bootrise_projects_org on bootrise_workspace_projects;
create policy bootrise_projects_org on bootrise_workspace_projects
  for all using (org_id in (select bootrise_user_org_ids()))
  with check (org_id in (select bootrise_user_org_ids()));

drop policy if exists bootrise_ledger_org on bootrise_living_ledger_events;
create policy bootrise_ledger_org on bootrise_living_ledger_events
  for all using (org_id in (select bootrise_user_org_ids()))
  with check (org_id in (select bootrise_user_org_ids()));

drop policy if exists bootrise_pending_org on bootrise_pending_fixes;
create policy bootrise_pending_org on bootrise_pending_fixes
  for all using (org_id in (select bootrise_user_org_ids()))
  with check (org_id in (select bootrise_user_org_ids()));

drop policy if exists bootrise_audit_org on bootrise_audit_events;
create policy bootrise_audit_org on bootrise_audit_events
  for select using (org_id in (select bootrise_user_org_ids()));

drop policy if exists bootrise_telemetry_org on bootrise_admin_telemetry;
create policy bootrise_telemetry_org on bootrise_admin_telemetry
  for select using (true);

-- Allow service role full access (default for server APIs using SUPABASE_SERVICE_ROLE_KEY)
