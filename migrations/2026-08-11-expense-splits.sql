-- ============================================================================
-- Expense splits between owners + debt settlements
-- ============================================================================
-- Run once in the Supabase SQL Editor of the Uber project. Idempotent:
-- re-running it does nothing. schema.sql already carries the same DDL for a
-- fresh install.
--
-- What it adds:
--   * expenses.paid_by_owner_id — who actually paid the expense
--   * expense_shares            — how the expense splits between owners
--   * settlements               — repayments between owners (NOT expenses)
-- ============================================================================

alter table expenses
  add column if not exists paid_by_owner_id uuid references owners (id) on delete set null;

create index if not exists expenses_paid_by_owner_id_idx on expenses (paid_by_owner_id);

create table if not exists expense_shares (
  id          uuid primary key default gen_random_uuid(),
  expense_id  uuid not null references expenses (id) on delete cascade,
  owner_id    uuid not null references owners (id) on delete cascade,
  amount      numeric(12,2) not null check (amount > 0),
  created_at  timestamptz not null default now(),
  unique (expense_id, owner_id)
);

create index if not exists expense_shares_expense_id_idx on expense_shares (expense_id);
create index if not exists expense_shares_owner_id_idx   on expense_shares (owner_id);

create table if not exists settlements (
  id             uuid primary key default gen_random_uuid(),
  from_owner_id  uuid not null references owners (id) on delete restrict,
  to_owner_id    uuid not null references owners (id) on delete restrict,
  amount         numeric(12,2) not null check (amount > 0),
  date           date not null,
  notes          text,
  created_at     timestamptz not null default now(),
  check (from_owner_id <> to_owner_id)
);

create index if not exists settlements_date_idx on settlements (date);
create index if not exists settlements_from_idx on settlements (from_owner_id);
create index if not exists settlements_to_idx   on settlements (to_owner_id);

alter table expense_shares enable row level security;
alter table settlements    enable row level security;
