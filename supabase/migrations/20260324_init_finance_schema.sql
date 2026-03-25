-- Core user-scoped finance tables for cloud sync
-- Naming mirrors app SQLite schema for straightforward upsert/pull.

create table if not exists public.accounts (
  id text primary key,
  "userId" uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('checking', 'savings', 'credit_card')),
  balance numeric not null default 0,
  currency text not null default 'USD',
  "isDefault" boolean not null default false,
  "createdAt" bigint not null,
  "updatedAt" bigint not null,
  "deletedAt" bigint,
  "deviceId" text
);

create table if not exists public.categories (
  id text primary key,
  "userId" uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  color text not null,
  "createdAt" bigint not null,
  "updatedAt" bigint not null,
  "deletedAt" bigint,
  "deviceId" text
);

create table if not exists public.transactions (
  id text primary key,
  "userId" uuid not null references auth.users(id) on delete cascade,
  "accountId" text,
  "categoryId" text not null,
  amount numeric not null,
  currency text not null default 'USD',
  description text,
  date bigint not null,
  type text not null check (type in ('income', 'expense')),
  "subscriptionId" text,
  "createdAt" bigint not null,
  "updatedAt" bigint not null,
  "deletedAt" bigint,
  "deviceId" text
);

create table if not exists public.budgets (
  id text primary key,
  "userId" uuid not null references auth.users(id) on delete cascade,
  "categoryId" text not null,
  budget_limit numeric not null,
  currency text not null default 'USD',
  period text not null check (period in ('monthly', 'yearly')),
  "allowCarryover" boolean not null default true,
  "lastCarryoverAmount" numeric not null default 0,
  "lastPeriodEnd" bigint not null default 0,
  "createdAt" bigint not null,
  "updatedAt" bigint not null,
  "deletedAt" bigint,
  "deviceId" text
);

create table if not exists public.monthly_budgets (
  id text primary key,
  "userId" uuid not null references auth.users(id) on delete cascade,
  amount numeric not null,
  currency text not null default 'USD',
  month int not null,
  year int not null,
  "createdAt" bigint not null,
  "updatedAt" bigint not null,
  "deletedAt" bigint,
  "deviceId" text,
  unique("userId", month, year)
);

create table if not exists public.goals (
  id text primary key,
  "userId" uuid not null references auth.users(id) on delete cascade,
  name text not null,
  "targetAmount" numeric not null,
  "currentAmount" numeric not null default 0,
  currency text not null default 'USD',
  deadline bigint not null,
  "createdAt" bigint not null,
  "updatedAt" bigint not null,
  "deletedAt" bigint,
  "deviceId" text
);

create table if not exists public.subscriptions (
  id text primary key,
  "userId" uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount numeric not null,
  currency text not null default 'USD',
  "categoryId" text not null,
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly', 'yearly')),
  "startDate" bigint not null,
  "nextDueDate" bigint not null,
  "isActive" boolean not null default true,
  "reminderDays" int not null default 3,
  notes text,
  "createdAt" bigint not null,
  "updatedAt" bigint not null,
  "deletedAt" bigint,
  "deviceId" text
);

create table if not exists public.user_profile (
  id text primary key,
  "userId" uuid not null references auth.users(id) on delete cascade,
  name text not null,
  "defaultCurrency" text not null default 'USD',
  "onboardingCompleted" boolean not null default false,
  "createdAt" bigint not null,
  "updatedAt" bigint not null,
  "deletedAt" bigint,
  "deviceId" text
);

create table if not exists public.entitlements (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  entitlement text not null,
  is_active boolean not null,
  source text not null default 'revenuecat',
  product_id text,
  expires_at timestamptz,
  event_timestamp timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb
);

create table if not exists public.revenuecat_events (
  id bigserial primary key,
  event_id text unique,
  user_id uuid,
  event_type text not null,
  received_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb
);

create index if not exists idx_accounts_user_updated on public.accounts("userId", "updatedAt");
create index if not exists idx_accounts_user_deleted on public.accounts("userId", "deletedAt");
create index if not exists idx_categories_user_updated on public.categories("userId", "updatedAt");
create index if not exists idx_categories_user_deleted on public.categories("userId", "deletedAt");
create index if not exists idx_transactions_user_updated on public.transactions("userId", "updatedAt");
create index if not exists idx_transactions_user_deleted on public.transactions("userId", "deletedAt");
create index if not exists idx_budgets_user_updated on public.budgets("userId", "updatedAt");
create index if not exists idx_budgets_user_deleted on public.budgets("userId", "deletedAt");
create index if not exists idx_goals_user_updated on public.goals("userId", "updatedAt");
create index if not exists idx_goals_user_deleted on public.goals("userId", "deletedAt");
create index if not exists idx_subscriptions_user_updated on public.subscriptions("userId", "updatedAt");
create index if not exists idx_subscriptions_user_deleted on public.subscriptions("userId", "deletedAt");
create index if not exists idx_entitlements_user on public.entitlements(user_id, event_timestamp desc);

alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.monthly_budgets enable row level security;
alter table public.goals enable row level security;
alter table public.subscriptions enable row level security;
alter table public.user_profile enable row level security;
alter table public.entitlements enable row level security;
alter table public.revenuecat_events enable row level security;

drop policy if exists accounts_user_scope on public.accounts;
create policy accounts_user_scope on public.accounts
for all using (auth.uid() = "userId") with check (auth.uid() = "userId");

drop policy if exists categories_user_scope on public.categories;
create policy categories_user_scope on public.categories
for all using (auth.uid() = "userId") with check (auth.uid() = "userId");

drop policy if exists transactions_user_scope on public.transactions;
create policy transactions_user_scope on public.transactions
for all using (auth.uid() = "userId") with check (auth.uid() = "userId");

drop policy if exists budgets_user_scope on public.budgets;
create policy budgets_user_scope on public.budgets
for all using (auth.uid() = "userId") with check (auth.uid() = "userId");

drop policy if exists monthly_budgets_user_scope on public.monthly_budgets;
create policy monthly_budgets_user_scope on public.monthly_budgets
for all using (auth.uid() = "userId") with check (auth.uid() = "userId");

drop policy if exists goals_user_scope on public.goals;
create policy goals_user_scope on public.goals
for all using (auth.uid() = "userId") with check (auth.uid() = "userId");

drop policy if exists subscriptions_user_scope on public.subscriptions;
create policy subscriptions_user_scope on public.subscriptions
for all using (auth.uid() = "userId") with check (auth.uid() = "userId");

drop policy if exists user_profile_user_scope on public.user_profile;
create policy user_profile_user_scope on public.user_profile
for all using (auth.uid() = "userId") with check (auth.uid() = "userId");

drop policy if exists entitlements_user_scope on public.entitlements;
create policy entitlements_user_scope on public.entitlements
for select using (auth.uid() = user_id);

drop policy if exists revenuecat_events_deny_all on public.revenuecat_events;
create policy revenuecat_events_deny_all on public.revenuecat_events
for all using (false) with check (false);
