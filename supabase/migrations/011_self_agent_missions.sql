-- BootRise Self-Agent mission scope persistence
-- Safe to run in Supabase SQL editor. Re-runnable via IF NOT EXISTS.

create table if not exists bootrise_self_agent_missions (
  id text primary key,
  org_id text not null default 'org_default',
  admin_build_mission_id text,
  title text not null,
  description text not null,
  target_branch text not null,
  status text not null default 'scoped',
  estimated_risk_level text not null default 'medium',
  requires_admin_approval boolean not null default true,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  scope jsonb not null default '{}'::jsonb,
  safety_note text,
  constraint bootrise_self_agent_branch_no_main check (target_branch !~* '(^|/)(main|master)$')
);

create index if not exists idx_bootrise_self_agent_missions_org_created
  on bootrise_self_agent_missions (org_id, created_at desc);

create index if not exists idx_bootrise_self_agent_missions_admin_build
  on bootrise_self_agent_missions (admin_build_mission_id);

comment on table bootrise_self_agent_missions is
  'Admin Self-Agent mission scope previews. This table stores planning metadata only; it does not authorize patch execution.';

comment on column bootrise_self_agent_missions.scope is
  'Scope preview containing work units, target files, read-only files, risk, and approval requirements.';
