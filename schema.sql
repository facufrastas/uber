-- ============================================================================
-- Fleet — Database schema (Supabase / PostgreSQL)
-- ============================================================================
-- Run this whole file in the Supabase SQL Editor.
-- Creation order respects FK dependencies:
--   cars → drivers → shifts → payments → maintenances → expense_types → expenses
--
-- Decisions:
--   * uuid PKs with DEFAULT gen_random_uuid(): native in Postgres 13+ (no
--     extensions), and lets the client generate ids with crypto.randomUUID()
--     (same pattern as the Supabase controllers in FresaStuff-API).
--   * Money columns are numeric(12,2) — never float for money.
--   * A maintenance's cost lives ONLY in its linked expense
--     (expenses.maintenance_id), single source of truth.
--   * Column names map 1:1 to the app's domain types (snake_case here,
--     camelCase in TypeScript).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- CARS
-- ----------------------------------------------------------------------------
create table cars (
  id             uuid primary key default gen_random_uuid(),
  brand          text not null,
  model          text not null,
  license_plate  text not null unique,
  year           integer check (year >= 1990),
  current_km     integer not null default 0 check (current_km >= 0),
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- DRIVERS
-- car_id nullable: a driver can be temporarily unassigned.
-- The "1 to 2 drivers per car" business rule is enforced in the application,
-- not in DDL (a CHECK cannot count rows of another table).
-- ----------------------------------------------------------------------------
create table drivers (
  id          uuid primary key default gen_random_uuid(),
  car_id      uuid references cars (id) on delete set null,
  name        text not null,
  phone       text,
  dni         text unique,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create index drivers_car_id_idx on drivers (car_id);

-- ----------------------------------------------------------------------------
-- SHIFTS
-- car_id is stored on the shift (besides the driver's current car) on
-- purpose: the shift records the car that was actually driven, even if the
-- driver switches cars later.
-- ON DELETE RESTRICT: a car/driver with historic shifts cannot be deleted.
-- ----------------------------------------------------------------------------
create table shifts (
  id          uuid primary key default gen_random_uuid(),
  driver_id   uuid not null references drivers (id) on delete restrict,
  car_id      uuid not null references cars (id) on delete restrict,
  date        date not null,
  start_time  time,
  end_time    time,
  notes       text,
  created_at  timestamptz not null default now()
);

create index shifts_date_idx      on shifts (date);
create index shifts_driver_id_idx on shifts (driver_id);
create index shifts_car_id_idx    on shifts (car_id);

-- ----------------------------------------------------------------------------
-- PAYMENTS
-- 1:1 relationship with shifts, guaranteed by the UNIQUE on shift_id.
-- ON DELETE CASCADE: deleting the shift deletes its payment.
-- payment_method: always 'transferencia' today, but the column keeps the
-- database ready for other methods in the future. Values stay in Spanish:
-- they are data shown to the user.
-- ----------------------------------------------------------------------------
create table payments (
  id              uuid primary key default gen_random_uuid(),
  shift_id        uuid not null unique references shifts (id) on delete cascade,
  amount          numeric(12,2) not null check (amount >= 0),
  payment_method  text not null default 'transferencia',
  notes           text,
  created_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- MAINTENANCES
-- ON DELETE CASCADE: deleting the car deletes its maintenance history
-- (and, cascading via expenses.maintenance_id, its linked expenses).
-- ----------------------------------------------------------------------------
create table maintenances (
  id            uuid primary key default gen_random_uuid(),
  car_id        uuid not null references cars (id) on delete cascade,
  service_type  text not null,
  km            integer check (km >= 0),
  date          date not null,
  notes         text,
  created_at    timestamptz not null default now()
);

create index maintenances_car_id_idx on maintenances (car_id);
create index maintenances_date_idx   on maintenances (date);

-- ----------------------------------------------------------------------------
-- EXPENSE TYPES
-- Seed names stay in Spanish: they are displayed to the user.
-- ----------------------------------------------------------------------------
create table expense_types (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  created_at  timestamptz not null default now()
);

insert into expense_types (name) values
  ('Combustible'),
  ('Mantenimiento'),
  ('Seguro'),
  ('Patente'),
  ('Lavado'),
  ('Multas'),
  ('Peajes'),
  ('Otros');

-- ----------------------------------------------------------------------------
-- EXPENSES
-- car_id nullable: general company expenses not tied to a car.
-- maintenance_id nullable + UNIQUE: a maintenance generates exactly one
-- linked expense (the app creates it automatically). ON DELETE CASCADE:
-- deleting the maintenance deletes its expense.
-- ON DELETE RESTRICT on expense_type_id: a type in use cannot be deleted.
-- ----------------------------------------------------------------------------
create table expenses (
  id               uuid primary key default gen_random_uuid(),
  expense_type_id  uuid not null references expense_types (id) on delete restrict,
  car_id           uuid references cars (id) on delete set null,
  maintenance_id   uuid unique references maintenances (id) on delete cascade,
  amount           numeric(12,2) not null check (amount > 0),
  date             date not null,
  description      text,
  created_at       timestamptz not null default now()
);

create index expenses_date_idx            on expenses (date);
create index expenses_car_id_idx          on expenses (car_id);
create index expenses_expense_type_id_idx on expenses (expense_type_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
-- RLS is enabled on every table WITHOUT creating policies for the anon role:
-- deny-by-default. Access goes through FresaStuff-API using the service key
-- (which bypasses RLS). If the frontend ever talks to Supabase directly, add
-- explicit policies here.
-- ============================================================================
alter table cars           enable row level security;
alter table drivers        enable row level security;
alter table shifts         enable row level security;
alter table payments       enable row level security;
alter table maintenances   enable row level security;
alter table expense_types  enable row level security;
alter table expenses       enable row level security;
