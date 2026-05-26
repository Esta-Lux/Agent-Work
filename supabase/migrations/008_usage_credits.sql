-- BootRise usage credits and balances

create table if not exists bootrise_credit_balances (
  id text primary key,
  org_id text not null references bootrise_organizations(id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  included_credits integer not null default 0,
  used_credits integer not null default 0,
  premium_credit_cap integer not null default 0,
  premium_credits_used integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists bootrise_credit_transactions (
  id text primary key,
  org_id text not null,
  user_id text not null,
  action text not null,
  credits integer not null,
  balance_after integer not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table bootrise_credit_balances enable row level security;
alter table bootrise_credit_transactions enable row level security;

create policy bootrise_credit_balances_org on bootrise_credit_balances
  for all using (org_id in (select bootrise_user_org_ids()))
  with check (org_id in (select bootrise_user_org_ids()));

create policy bootrise_credit_transactions_org on bootrise_credit_transactions
  for all using (org_id in (select bootrise_user_org_ids()))
  with check (org_id in (select bootrise_user_org_ids()));
