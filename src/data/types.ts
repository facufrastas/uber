// Domain types. They mirror the tables in schema.sql 1:1 (same fields in
// camelCase), so mapping to the API's snake_case rows is trivial.

export interface Car {
  id: string;
  brand: string;
  model: string;
  licensePlate: string;
  year: number | null;
  currentKm: number;
  active: boolean;
  // purchaseCost is in USD while every income/expense is in ARS: the payoff
  // progress converts with the current "dólar oficial" rate. Both null means
  // the car has no purchase data loaded and the payoff bar is hidden.
  purchaseCost: number | null;
  purchaseDate: string | null;
  createdAt: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string | null;
  dni: string | null;
  active: boolean;
  createdAt: string;
}

export interface Owner {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  active: boolean;
  createdAt: string;
}

// Junction rows. They carry their own id so they go through the same generic
// repository as every other entity (both data sources and the API).
export interface DriverCar {
  id: string;
  driverId: string;
  carId: string;
  createdAt: string;
}

export interface CarOwner {
  id: string;
  carId: string;
  ownerId: string;
  percentage: number; // 0 < percentage <= 100; per car they must add up to 100
  createdAt: string;
}

export interface Shift {
  id: string;
  driverId: string;
  carId: string;
  date: string; // 'YYYY-MM-DD'
  startTime: string | null; // 'HH:mm'
  endTime: string | null;
  notes: string | null;
  createdAt: string;
}

// stored values stay in Spanish: they are data (schema.sql default) and are
// shown to the user
export const PAYMENT_METHODS = ['transferencia', 'efectivo', 'otro'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface Payment {
  id: string;
  shiftId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  notes: string | null;
  createdAt: string;
}

export interface Maintenance {
  id: string;
  carId: string;
  serviceType: string;
  km: number | null;
  date: string;
  notes: string | null;
  createdAt: string;
}

export interface ExpenseType {
  id: string;
  name: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  expenseTypeId: string;
  carId: string | null;
  maintenanceId: string | null;
  // Who put the money in. null = nobody claimed it (legacy rows and expenses
  // paid from the fleet itself); without a payer the expense generates no debt.
  paidByOwnerId: string | null;
  amount: number;
  date: string;
  description: string | null;
  // Settled by hand from the Gastos table (there is no rule that flips it):
  // true parks the expense in the "Gastos Saldados" section. Independent of
  // the split — an expense can be settled and still have debts pending.
  payed: boolean;
  createdAt: string;
}

// One participant's part of an expense, in ARS (not a percentage: uneven
// splits are expressible and the debt math is a plain sum — the dialog shows
// the percentage and rewrites the amounts). No shares at all = not split.
// The payer's own share is a row too and is NOT a debt: what someone owes is
// their share of an expense paid by someone else.
export interface ExpenseShare {
  id: string;
  expenseId: string;
  ownerId: string;
  amount: number;
  createdAt: string;
}

// A repayment between owners ("person 2 gives person 1 the 70k back"). It is
// NOT an expense: it never reaches the KPIs, it only cancels a balance.
export interface Settlement {
  id: string;
  fromOwnerId: string; // who pays
  toOwnerId: string; // who gets paid
  amount: number;
  date: string;
  notes: string | null;
  createdAt: string;
}

// Creation DTOs: the repository generates id and createdAt.
export type CarCreate = Omit<Car, 'id' | 'createdAt'>;
export type DriverCreate = Omit<Driver, 'id' | 'createdAt'>;
export type OwnerCreate = Omit<Owner, 'id' | 'createdAt'>;
export type DriverCarCreate = Omit<DriverCar, 'id' | 'createdAt'>;
export type CarOwnerCreate = Omit<CarOwner, 'id' | 'createdAt'>;
export type ShiftCreate = Omit<Shift, 'id' | 'createdAt'>;
export type PaymentCreate = Omit<Payment, 'id' | 'createdAt'>;
export type MaintenanceCreate = Omit<Maintenance, 'id' | 'createdAt'>;
// payed is optional on create: a new expense is unsettled (the column
// defaults to false), the flag is only ever sent by the toggle.
export type ExpenseCreate = Omit<Expense, 'id' | 'createdAt' | 'payed'> & { payed?: boolean };
export type ExpenseShareCreate = Omit<ExpenseShare, 'id' | 'createdAt'>;
export type SettlementCreate = Omit<Settlement, 'id' | 'createdAt'>;
