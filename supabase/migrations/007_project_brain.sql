-- BootRise Project Brain — durable project memory and file index

create table if not exists bootrise_project_brains (
  id text primary key,
  org_id text not null references bootrise_organizations(id) on delete cascade,
  project_id text not null,
  name text not null,
  summary text,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (org_id, project_id)
);

create table if not exists bootrise_project_memory_items (
  id text primary key,
  org_id text not null references bootrise_organizations(id) on delete cascade,
  project_id text not null,
  brain_id text not null references bootrise_project_brains(id) on delete cascade,
  type text not null,
  title text not null,
  content text not null,
  source text not null,
  confidence numeric not null default 0.7,
  status text not null default 'active',
  related_paths jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists bootrise_file_index (
  id text primary key,
  org_id text not null,
  project_id text not null,
  repository_id text,
  path text not null,
  hash text not null,
  language text,
  size_bytes integer,
  module_name text,
  summary text,
  risk_level text default 'normal',
  last_indexed_at timestamptz not null default timezone('utc'::text, now()),
  metadata jsonb not null default '{}'::jsonb,
  unique (project_id, path)
);

create table if not exists bootrise_module_index (
  id text primary key,
  org_id text not null,
  project_id text not null,
  name text not null,
  purpose text,
  main_files jsonb not null default '[]'::jsonb,
  apis jsonb not null default '[]'::jsonb,
  database_tables jsonb not null default '[]'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  summary text,
  confidence numeric default 0.7,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists bootrise_decision_records (
  id text primary key,
  org_id text not null,
  project_id text not null,
  title text not null,
  decision text not null,
  reason text,
  applies_to jsonb not null default '[]'::jsonb,
  source text not null,
  status text default 'active',
  created_by text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists bootrise_memory_corrections (
  id text primary key,
  org_id text not null,
  project_id text not null,
  memory_item_id text,
  old_value text,
  new_value text not null,
  corrected_by text not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table bootrise_project_brains enable row level security;
alter table bootrise_project_memory_items enable row level security;
alter table bootrise_file_index enable row level security;
alter table bootrise_module_index enable row level security;
alter table bootrise_decision_records enable row level security;
alter table bootrise_memory_corrections enable row level security;

create policy bootrise_brains_org on bootrise_project_brains
  for all using (org_id in (select bootrise_user_org_ids()))
  with check (org_id in (select bootrise_user_org_ids()));

create policy bootrise_memory_org on bootrise_project_memory_items
  for all using (org_id in (select bootrise_user_org_ids()))
  with check (org_id in (select bootrise_user_org_ids()));

create policy bootrise_file_index_org on bootrise_file_index
  for all using (org_id in (select bootrise_user_org_ids()))
  with check (org_id in (select bootrise_user_org_ids()));

create policy bootrise_module_index_org on bootrise_module_index
  for all using (org_id in (select bootrise_user_org_ids()))
  with check (org_id in (select bootrise_user_org_ids()));

create policy bootrise_decisions_org on bootrise_decision_records
  for all using (org_id in (select bootrise_user_org_ids()))
  with check (org_id in (select bootrise_user_org_ids()));

create policy bootrise_corrections_org on bootrise_memory_corrections
  for all using (org_id in (select bootrise_user_org_ids()))
  with check (org_id in (select bootrise_user_org_ids()));
