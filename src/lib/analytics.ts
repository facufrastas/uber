import type { Filters } from '@/hooks/useFilters';
import { daysInRange, previousRange, type DateRange } from '@/lib/dates';
import type { Car, CarOwner, Driver, DriverCar, Expense, ExpenseType, Owner, Payment, Shift } from '@/data/types';

// PURE selectors: (data, filters) => result. No state, no hooks, testable in
// isolation. The UI consumes them via useFilteredData (useMemo).

export interface DataSlice {
  cars: Car[];
  drivers: Driver[];
  owners: Owner[];
  driverCars: DriverCar[];
  carOwners: CarOwner[];
  shifts: Shift[];
  payments: Payment[];
  expenses: Expense[];
  expenseTypes: ExpenseType[];
}

export interface FilteredData {
  shifts: Shift[];
  payments: Payment[];
  expenses: Expense[];
}

const inRange = (date: string, { from, to }: DateRange) => date >= from && date <= to;

// Intersection of the car sets implied by the active filters, or null when a
// filter doesn't constrain cars at all. An EMPTY set is meaningful
// (contradictory filters → nothing matches), so null and empty differ.
function intersect(sets: (Set<string> | null)[]): Set<string> | null {
  const active = sets.filter((s): s is Set<string> => s !== null);

  if (active.length === 0) return null;

  return active.reduce((acc, set) => new Set([...acc].filter((id) => set.has(id))));
}

export const carsOfOwner = (data: Pick<DataSlice, 'carOwners'>, ownerId: string) => new Set(data.carOwners.filter((co) => co.ownerId === ownerId).map((co) => co.carId));

export const carsOfDriver = (data: Pick<DataSlice, 'driverCars'>, driverId: string) => new Set(data.driverCars.filter((dc) => dc.driverId === driverId).map((dc) => dc.carId));

export function applyFilters(data: DataSlice, filters: Filters): FilteredData {
  const { range, carId, driverId, ownerId } = filters;

  const carSet = carId ? new Set([carId]) : null;
  const ownerSet = ownerId ? carsOfOwner(data, ownerId) : null;
  // Shifts know their driver, so the driver filter applies directly to them
  // and only its cars matter for expenses.
  const driverSet = driverId ? carsOfDriver(data, driverId) : null;

  const shiftCars = intersect([carSet, ownerSet]);
  // Expenses have no driver: filtering by driver restricts them to the cars
  // that driver is assigned to (documented in docs/filtros-y-derivados.md).
  // Note general expenses (carId null) drop out as soon as any car
  // constraint is active.
  const expenseCars = intersect([carSet, ownerSet, driverSet]);

  const shifts = data.shifts.filter((s) => inRange(s.date, range) && (!shiftCars || shiftCars.has(s.carId)) && (!driverId || s.driverId === driverId));
  const shiftIds = new Set(shifts.map((s) => s.id));
  const payments = data.payments.filter((p) => shiftIds.has(p.shiftId));

  const expenses = data.expenses.filter((e) => inRange(e.date, range) && (!expenseCars || (e.carId !== null && expenseCars.has(e.carId))));

  return { shifts, payments, expenses };
}

// ---------------------------------------------------------------------------
// KPIs
// ---------------------------------------------------------------------------

export interface Kpis {
  totalIncome: number;
  totalExpenses: number;
  net: number;
  shiftCount: number;
  averagePerShift: number;
}

export function computeKpis({ shifts, payments, expenses }: FilteredData): Kpis {
  const totalIncome = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return {
    totalIncome,
    totalExpenses,
    net: totalIncome - totalExpenses,
    shiftCount: shifts.length,
    averagePerShift: shifts.length ? totalIncome / shifts.length : 0,
  };
}

// KPIs for the previous period of equal length, to show deltas.
export function computeKpisPrevious(data: DataSlice, filters: Filters): Kpis {
  const prevFilters: Filters = { ...filters, range: previousRange(filters.range) };

  return computeKpis(applyFilters(data, prevFilters));
}

// ---------------------------------------------------------------------------
// Chart series
// ---------------------------------------------------------------------------

export interface DailyPoint {
  date: string;
  income: number;
  expenses: number;
}

// Gap-free daily series: days with no activity show as 0 so the area chart
// doesn't "jump".
export function incomeVsExpensesByDay(data: DataSlice, filtered: FilteredData, range: DateRange): DailyPoint[] {
  const shiftDate = new Map(data.shifts.map((s) => [s.id, s.date]));
  const byDay = new Map<string, DailyPoint>(daysInRange(range).map((date) => [date, { date, income: 0, expenses: 0 }]));

  for (const payment of filtered.payments) {
    const point = byDay.get(shiftDate.get(payment.shiftId) ?? '');

    if (point) point.income += payment.amount;
  }
  for (const expense of filtered.expenses) {
    const point = byDay.get(expense.date);

    if (point) point.expenses += expense.amount;
  }

  return [...byDay.values()];
}

export interface AmountByName {
  id: string;
  name: string;
  amount: number;
}

function sumBy<T>(items: T[], keyOf: (item: T) => string | null, amountOf: (item: T) => number) {
  const sums = new Map<string, number>();

  for (const item of items) {
    const key = keyOf(item);

    if (key === null) continue;
    sums.set(key, (sums.get(key) ?? 0) + amountOf(item));
  }

  return sums;
}

export function incomeByCar(data: DataSlice, filtered: FilteredData): AmountByName[] {
  const shiftCar = new Map(data.shifts.map((s) => [s.id, s.carId]));
  const sums = sumBy(
    filtered.payments,
    (p) => shiftCar.get(p.shiftId) ?? null,
    (p) => p.amount
  );

  return data.cars
    .map((c) => ({ id: c.id, name: `${c.model} ${c.licensePlate}`, amount: sums.get(c.id) ?? 0 }))
    .filter((r) => r.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

export function expensesByCar(data: DataSlice, filtered: FilteredData): AmountByName[] {
  const sums = sumBy(
    filtered.expenses,
    (e) => e.carId,
    (e) => e.amount
  );

  return data.cars
    .map((c) => ({ id: c.id, name: `${c.model} ${c.licensePlate}`, amount: sums.get(c.id) ?? 0 }))
    .filter((r) => r.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

export function incomeByDriver(data: DataSlice, filtered: FilteredData): AmountByName[] {
  const shiftDriver = new Map(data.shifts.map((s) => [s.id, s.driverId]));
  const sums = sumBy(
    filtered.payments,
    (p) => shiftDriver.get(p.shiftId) ?? null,
    (p) => p.amount
  );

  return data.drivers
    .map((d) => ({ id: d.id, name: d.name, amount: sums.get(d.id) ?? 0 }))
    .filter((r) => r.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

export function expensesByType(data: DataSlice, filtered: FilteredData): AmountByName[] {
  const sums = sumBy(
    filtered.expenses,
    (e) => e.expenseTypeId,
    (e) => e.amount
  );

  return data.expenseTypes
    .map((t) => ({ id: t.id, name: t.name, amount: sums.get(t.id) ?? 0 }))
    .filter((r) => r.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

// Net per car (income minus that car's expenses) over the filtered slice.
// General expenses without a car stay out: they belong to no owner.
function netByCar(data: DataSlice, filtered: FilteredData): Map<string, number> {
  const shiftCar = new Map(data.shifts.map((s) => [s.id, s.carId]));
  const net = new Map<string, number>(data.cars.map((c) => [c.id, 0]));

  for (const payment of filtered.payments) {
    const carId = shiftCar.get(payment.shiftId);

    if (carId !== undefined) net.set(carId, (net.get(carId) ?? 0) + payment.amount);
  }
  for (const expense of filtered.expenses) {
    if (expense.carId !== null) net.set(expense.carId, (net.get(expense.carId) ?? 0) - expense.amount);
  }

  return net;
}

// Each owner gets their percentage of the net of every car they own. Zero is
// filtered out but negatives are NOT: an owner losing money must be visible.
export function netByOwner(data: DataSlice, filtered: FilteredData): AmountByName[] {
  const net = netByCar(data, filtered);
  const sums = new Map<string, number>();

  for (const { carId, ownerId, percentage } of data.carOwners) {
    sums.set(ownerId, (sums.get(ownerId) ?? 0) + ((net.get(carId) ?? 0) * percentage) / 100);
  }

  return data.owners
    .map((o) => ({ id: o.id, name: o.name, amount: sums.get(o.id) ?? 0 }))
    .filter((r) => r.amount !== 0)
    .sort((a, b) => b.amount - a.amount);
}

// ---------------------------------------------------------------------------
// Car payoff
// ---------------------------------------------------------------------------

export interface CarPayoff {
  earnedArs: number;
  earnedUsd: number | null;
  costUsd: number;
  pct: number | null; // NOT clamped: over 100 means the car already paid itself
}

// How much of the car's purchase price its own earnings have covered.
//
// Deliberately takes `data` and no Filters: this is a lifetime figure since
// the purchase date, so the dashboard's date range must not change it. The
// cost is in USD and everything else in ARS, converted with the CURRENT rate
// (no historical rates — accepted simplification, see docs).
export function carPayoff(data: DataSlice, carId: string, rateArsPerUsd: number | null): CarPayoff | null {
  const car = data.cars.find((c) => c.id === carId);

  if (!car || car.purchaseCost === null || car.purchaseDate === null) return null;

  const since = car.purchaseDate;
  const shiftIds = new Set(data.shifts.filter((s) => s.carId === carId && s.date >= since).map((s) => s.id));
  const income = data.payments.filter((p) => shiftIds.has(p.shiftId)).reduce((sum, p) => sum + p.amount, 0);
  const expenses = data.expenses.filter((e) => e.carId === carId && e.date >= since).reduce((sum, e) => sum + e.amount, 0);

  const earnedArs = income - expenses;
  const earnedUsd = rateArsPerUsd ? earnedArs / rateArsPerUsd : null;

  return {
    earnedArs,
    earnedUsd,
    costUsd: car.purchaseCost,
    pct: earnedUsd === null ? null : (earnedUsd / car.purchaseCost) * 100,
  };
}

// Percentages of a car must add up to 100 — enforced by the forms, but an
// owner deleted elsewhere can leave a car short, so screens flag it.
export function ownershipPercentage(data: Pick<DataSlice, 'carOwners'>, carId: string): number {
  return data.carOwners.filter((co) => co.carId === carId).reduce((sum, co) => sum + co.percentage, 0);
}
