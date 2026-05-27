alter table bootrise_workspace_projects
  add column if not exists repository_id text;

create index if not exists idx_bootrise_workspace_projects_repository
  on bootrise_workspace_projects (repository_id);

comment on column bootrise_workspace_projects.repository_id is
  'Canonical BootRise repo-store id used to reload imported files into chat, analysis, Project Brain, and verification.';
