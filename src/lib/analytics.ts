import type { Filters } from '@/hooks/useFilters';
import { daysInRange, previousRange, type DateRange } from '@/lib/dates';
import type { Car, Driver, Expense, ExpenseType, Payment, Shift } from '@/data/types';

// PURE selectors: (data, filters) => result. No state, no hooks, testable in
// isolation. The UI consumes them via useFilteredData (useMemo).

export interface DataSlice {
  cars: Car[];
  drivers: Driver[];
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

export function applyFilters(data: DataSlice, filters: Filters): FilteredData {
  const { range, carId, driverId } = filters;

  const shifts = data.shifts.filter((s) => inRange(s.date, range) && (!carId || s.carId === carId) && (!driverId || s.driverId === driverId));
  const shiftIds = new Set(shifts.map((s) => s.id));
  const payments = data.payments.filter((p) => shiftIds.has(p.shiftId));

  // Expenses have no driver: when filtering by driver we restrict to the car
  // assigned to that driver (decision documented in docs/filtros-y-derivados.md).
  const driversCarId = driverId ? (data.drivers.find((d) => d.id === driverId)?.carId ?? null) : null;
  const expenseCarId = carId ?? driversCarId;

  const expenses = data.expenses.filter((e) => inRange(e.date, range) && (!expenseCarId || e.carId === expenseCarId));

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
