-- ============================================================================
-- Expenses: settled flag
-- ============================================================================
-- Run once in the Supabase SQL Editor of the Uber project. Idempotent:
-- re-running it does nothing. schema.sql already carries the same DDL for a
-- fresh install.
--
-- What it adds:
--   * expenses.payed — flipped by hand from the Gastos table; true moves the
--     row to the "Gastos Saldados" section. Not a payment record: the money
--     side of an expense lives in paid_by_owner_id + expense_shares.
-- ============================================================================

alter table expenses
  add column if not exists payed boolean not null default false;

create index if not exists expenses_payed_idx on expenses (payed);
