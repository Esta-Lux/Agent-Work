-- BootRise beta safety spine: usage, quotas, provider policies, feature flags, PR records

create table if not exists bootrise_usage_events (
  id text primary key,
  org_id text not null default 'org_default',
  user_id text not null,
  project_id text not null,
  provider text not null check (provider in ('bootrise', 'openai', 'claude', 'codex')),
  model text not null,
  mode text not null check (mode in ('fast', 'deep', 'security', 'premium')),
  task_type text not null,
  risk text not null check (risk in ('low', 'medium', 'high', 'critical')),
  estimated_input_tokens integer not null default 0,
  estimated_output_tokens integer not null default 0,
  estimated_cost_usd numeric(12, 6) not null default 0,
  credits_charged integer not null default 0,
  premium_credits_charged integer not null default 0,
  status text not null check (status in ('estimated', 'allowed', 'blocked', 'succeeded', 'failed')),
  failure_reason text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_bootrise_usage_org_time
  on bootrise_usage_events (org_id, created_at desc);

create index if not exists idx_bootrise_usage_user_month
  on bootrise_usage_events (org_id, user_id, created_at desc);

create table if not exists bootrise_quota_policies (
  id text primary key,
  org_id text not null default 'org_default',
  plan text not null,
  monthly_credits integer not null,
  monthly_premium_credits integer not null,
  max_ai_calls_per_run integer not null,
  max_patch_attempts integer not null,
  max_files_indexed integer not null,
  max_files_changed integer not null,
  max_sandbox_minutes integer not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create unique index if not exists idx_bootrise_quota_plan
  on bootrise_quota_policies (org_id, plan);

create table if not exists bootrise_provider_policies (
  id text primary key,
  org_id text not null default 'org_default',
  provider text not null check (provider in ('bootrise', 'openai', 'claude', 'codex')),
  enabled boolean not null default true,
  premium boolean not null default false,
  requires_approval boolean not null default false,
  monthly_credit_limit integer,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create unique index if not exists idx_bootrise_provider_policy
  on bootrise_provider_policies (org_id, provider);

create table if not exists bootrise_feature_flags (
  id text primary key,
  org_id text not null default 'org_default',
  flag text not null,
  enabled boolean not null default true,
  scope text not null default 'global' check (scope in ('global', 'user', 'project')),
  scope_id text,
  updated_by text not null default 'system',
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create unique index if not exists idx_bootrise_feature_flag_scope
  on bootrise_feature_flags (org_id, flag, scope, coalesce(scope_id, ''));

create table if not exists bootrise_github_pull_requests (
  id text primary key,
  org_id text not null default 'org_default',
  project_id text not null,
  repository_id text not null,
  provider text not null default 'github',
  remote_url text not null,
  base_branch text not null,
  head_branch text not null,
  pr_number integer,
  pr_url text,
  title text not null,
  body text not null,
  status text not null check (status in ('created', 'failed', 'fallback_export')),
  error_message text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_bootrise_pr_project_time
  on bootrise_github_pull_requests (org_id, project_id, created_at desc);

alter table bootrise_usage_events enable row level security;
alter table bootrise_quota_policies enable row level security;
alter table bootrise_provider_policies enable row level security;
alter table bootrise_feature_flags enable row level security;
alter table bootrise_github_pull_requests enable row level security;

drop policy if exists bootrise_usage_org on bootrise_usage_events;
create policy bootrise_usage_org on bootrise_usage_events
  for all using (org_id in (select bootrise_user_org_ids()))
  with check (org_id in (select bootrise_user_org_ids()));

drop policy if exists bootrise_quota_org on bootrise_quota_policies;
create policy bootrise_quota_org on bootrise_quota_policies
  for select using (org_id in (select bootrise_user_org_ids()));

drop policy if exists bootrise_provider_policy_org on bootrise_provider_policies;
create policy bootrise_provider_policy_org on bootrise_provider_policies
  for select using (org_id in (select bootrise_user_org_ids()));

drop policy if exists bootrise_feature_flags_org on bootrise_feature_flags;
create policy bootrise_feature_flags_org on bootrise_feature_flags
  for select using (org_id in (select bootrise_user_org_ids()));

drop policy if exists bootrise_pull_requests_org on bootrise_github_pull_requests;
create policy bootrise_pull_requests_org on bootrise_github_pull_requests
  for all using (org_id in (select bootrise_user_org_ids()))
  with check (org_id in (select bootrise_user_org_ids()));
