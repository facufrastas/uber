-- ============================================================================
-- Expenses: settled flag
-- ============================================================================
-- Run once in the Supabase SQL Editor of the Uber project. Idempotent:
-- re-running it does nothing. schema.sql already carries the same DDL for a
-- fresh install.
--
-- What it adds:
--   * expenses.paid — flipped by hand from the Gastos table; true moves the
--     row to the "Gastos Saldados" section. Not a payment record: the money
--     side of an expense lives in paid_by_owner_id + expense_shares.
--
-- The first version of this file shipped the column misspelled as `payed`.
-- The block below renames it (keeping the values) if that is what the database
-- has; on a database that never ran it, only the `add column` line does work.
-- ============================================================================

do $$
begin
  if exists (select 1 from information_schema.columns where table_name = 'expenses' and column_name = 'payed')
     and not exists (select 1 from information_schema.columns where table_name = 'expenses' and column_name = 'paid') then
    alter table expenses rename column payed to paid;
  end if;
end $$;

drop index if exists expenses_payed_idx;

alter table expenses
  add column if not exists paid boolean not null default false;

create index if not exists expenses_paid_idx on expenses (paid);
