-- BootRise Phase 1 — project ownership columns for tenant isolation

alter table bootrise_workspace_projects
  add column if not exists user_id text,
  add column if not exists created_by text;

create index if not exists idx_bootrise_workspace_projects_org_user
  on bootrise_workspace_projects (org_id, user_id, updated_at desc);

comment on column bootrise_workspace_projects.user_id is 'Owner user id from Supabase auth';
comment on column bootrise_workspace_projects.created_by is 'User id that created the project';
