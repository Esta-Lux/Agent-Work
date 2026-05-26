-- BootRise canonical repo metadata (optional cloud mirror of disk manifests)
-- Disk store at .bootrise/repos/{repositoryId} remains canonical; this table tracks org-level repo registry.

create table if not exists bootrise_repositories (
  id text primary key,
  org_id text not null default 'org_default',
  name text not null,
  remote_url text,
  default_branch text,
  source text not null check (source in ('demo', 'uploaded', 'github', 'local')),
  file_count integer not null default 0,
  last_synced_at timestamptz,
  manifest jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_bootrise_repositories_org on bootrise_repositories (org_id, updated_at desc);

create table if not exists bootrise_repo_snapshots (
  id text primary key,
  repository_id text not null references bootrise_repositories(id) on delete cascade,
  org_id text not null default 'org_default',
  label text not null,
  file_count integer not null default 0,
  manifest jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_bootrise_repo_snapshots_repo on bootrise_repo_snapshots (repository_id, created_at desc);
