import { apiFetch } from '@/lib/api';
import type { DataSource, MaintenanceRepository, Repository, ShiftRepository } from '@/data/repositories/types';
import type {
  Car,
  CarCreate,
  Driver,
  DriverCreate,
  Expense,
  ExpenseCreate,
  ExpenseType,
  Maintenance,
  MaintenanceCreate,
  Payment,
  PaymentCreate,
  PaymentMethod,
  Shift,
  ShiftCreate,
} from '@/data/types';

// DataSource against FresaStuff-API (/fleet/*). Each repository maps the
// DB's snake_case rows to the camelCase domain types (1:1 columns, see
// schema.sql). The composite creates hit ONE endpoint that performs both
// inserts server-side.
//
// Postgres quirks handled in the mappers:
//   * time columns come back as 'HH:mm:ss' — the app uses 'HH:mm'
//   * numeric columns may arrive as strings — always Number()

type Json = string | number | boolean | null;
type RowShape = Record<string, Json>;

// Partial updates: only the keys present in the input travel in the PATCH
// (null is meaningful — e.g. unassigning a driver's car — undefined is not).
function stripUndefined<T extends Record<string, Json | undefined>>(obj: T): RowShape {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as RowShape;
}

const toTime = (value: string | null) => (value ? value.slice(0, 5) : null);

// --- cars ---
interface CarRow {
  id: string;
  brand: string;
  model: string;
  license_plate: string;
  year: number | null;
  current_km: number;
  active: boolean;
  created_at: string;
}

const carFromRow = (r: CarRow): Car => ({
  id: r.id,
  brand: r.brand,
  model: r.model,
  licensePlate: r.license_plate,
  year: r.year,
  currentKm: r.current_km,
  active: r.active,
  createdAt: r.created_at,
});

const carToRow = (c: Partial<CarCreate>) =>
  stripUndefined({
    brand: c.brand,
    model: c.model,
    license_plate: c.licensePlate,
    year: c.year,
    current_km: c.currentKm,
    active: c.active,
  });

// --- drivers ---
interface DriverRow {
  id: string;
  car_id: string | null;
  name: string;
  phone: string | null;
  dni: string | null;
  active: boolean;
  created_at: string;
}

const driverFromRow = (r: DriverRow): Driver => ({
  id: r.id,
  carId: r.car_id,
  name: r.name,
  phone: r.phone,
  dni: r.dni,
  active: r.active,
  createdAt: r.created_at,
});

const driverToRow = (d: Partial<DriverCreate>) => stripUndefined({ car_id: d.carId, name: d.name, phone: d.phone, dni: d.dni, active: d.active });

// --- shifts ---
interface ShiftRow {
  id: string;
  driver_id: string;
  car_id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  created_at: string;
}

const shiftFromRow = (r: ShiftRow): Shift => ({
  id: r.id,
  driverId: r.driver_id,
  carId: r.car_id,
  date: r.date,
  startTime: toTime(r.start_time),
  endTime: toTime(r.end_time),
  notes: r.notes,
  createdAt: r.created_at,
});

const shiftToRow = (s: Partial<ShiftCreate>) =>
  stripUndefined({
    driver_id: s.driverId,
    car_id: s.carId,
    date: s.date,
    start_time: s.startTime,
    end_time: s.endTime,
    notes: s.notes,
  });

// --- payments ---
interface PaymentRow {
  id: string;
  shift_id: string;
  amount: number | string;
  payment_method: PaymentMethod;
  notes: string | null;
  created_at: string;
}

const paymentFromRow = (r: PaymentRow): Payment => ({
  id: r.id,
  shiftId: r.shift_id,
  amount: Number(r.amount),
  paymentMethod: r.payment_method,
  notes: r.notes,
  createdAt: r.created_at,
});

const paymentToRow = (p: Partial<PaymentCreate>) => stripUndefined({ shift_id: p.shiftId, amount: p.amount, payment_method: p.paymentMethod, notes: p.notes });

// --- maintenances ---
interface MaintenanceRow {
  id: string;
  car_id: string;
  service_type: string;
  km: number | null;
  date: string;
  notes: string | null;
  created_at: string;
}

const maintenanceFromRow = (r: MaintenanceRow): Maintenance => ({
  id: r.id,
  carId: r.car_id,
  serviceType: r.service_type,
  km: r.km,
  date: r.date,
  notes: r.notes,
  createdAt: r.created_at,
});

const maintenanceToRow = (m: Partial<MaintenanceCreate>) => stripUndefined({ car_id: m.carId, service_type: m.serviceType, km: m.km, date: m.date, notes: m.notes });

// --- expenses ---
interface ExpenseRow {
  id: string;
  expense_type_id: string;
  car_id: string | null;
  maintenance_id: string | null;
  amount: number | string;
  date: string;
  description: string | null;
  created_at: string;
}

const expenseFromRow = (r: ExpenseRow): Expense => ({
  id: r.id,
  expenseTypeId: r.expense_type_id,
  carId: r.car_id,
  maintenanceId: r.maintenance_id,
  amount: Number(r.amount),
  date: r.date,
  description: r.description,
  createdAt: r.created_at,
});

const expenseToRow = (e: Partial<ExpenseCreate>) =>
  stripUndefined({
    expense_type_id: e.expenseTypeId,
    car_id: e.carId,
    maintenance_id: e.maintenanceId,
    amount: e.amount,
    date: e.date,
    description: e.description,
  });

// --- generic repository over one /fleet resource ---
function makeRepository<T, TCreate, Row>(path: string, fromRow: (row: Row) => T, toRow: (input: Partial<TCreate>) => RowShape): Repository<T, TCreate> {
  return {
    async list() {
      return (await apiFetch<Row[]>(path)).map(fromRow);
    },
    async create(input) {
      return fromRow(await apiFetch<Row>(path, { method: 'POST', body: JSON.stringify(toRow(input)) }));
    },
    async update(id, input) {
      return fromRow(await apiFetch<Row>(`${path}/${id}`, { method: 'PATCH', body: JSON.stringify(toRow(input)) }));
    },
    async remove(id) {
      await apiFetch(`${path}/${id}`, { method: 'DELETE' });
    },
  };
}

const shiftsBase = makeRepository<Shift, ShiftCreate, ShiftRow>('/fleet/shifts', shiftFromRow, shiftToRow);

const shifts: ShiftRepository = {
  ...shiftsBase,
  // plain create doesn't exist server-side: POST /fleet/shifts always takes
  // { shift, payment } — the payment is 1:1 with the shift
  async createWithPayment(shiftInput, paymentInput) {
    const result = await apiFetch<{ shift: ShiftRow; payment: PaymentRow }>('/fleet/shifts', {
      method: 'POST',
      body: JSON.stringify({ shift: shiftToRow(shiftInput), payment: paymentToRow(paymentInput) }),
    });

    return { shift: shiftFromRow(result.shift), payment: paymentFromRow(result.payment) };
  },
};

const maintenancesBase = makeRepository<Maintenance, MaintenanceCreate, MaintenanceRow>('/fleet/maintenances', maintenanceFromRow, maintenanceToRow);

const maintenances: MaintenanceRepository = {
  ...maintenancesBase,
  // POST /fleet/maintenances takes { maintenance, expense } and creates both;
  // the server fills the expense's car_id, date and maintenance_id
  async createWithExpense(maintenanceInput, expenseInput) {
    const result = await apiFetch<{ maintenance: MaintenanceRow; expense: ExpenseRow }>('/fleet/maintenances', {
      method: 'POST',
      body: JSON.stringify({
        maintenance: maintenanceToRow(maintenanceInput),
        expense: expenseToRow(expenseInput),
      }),
    });

    return { maintenance: maintenanceFromRow(result.maintenance), expense: expenseFromRow(result.expense) };
  },
};

interface ExpenseTypeRow {
  id: string;
  name: string;
  created_at: string;
}

export const apiDataSource: DataSource = {
  cars: makeRepository<Car, CarCreate, CarRow>('/fleet/cars', carFromRow, carToRow),
  drivers: makeRepository<Driver, DriverCreate, DriverRow>('/fleet/drivers', driverFromRow, driverToRow),
  shifts,
  payments: makeRepository<Payment, PaymentCreate, PaymentRow>('/fleet/payments', paymentFromRow, paymentToRow),
  maintenances,
  expenseTypes: {
    async list() {
      const rows = await apiFetch<ExpenseTypeRow[]>('/fleet/expense-types');

      return rows.map((r): ExpenseType => ({ id: r.id, name: r.name, createdAt: r.created_at }));
    },
  },
  expenses: makeRepository<Expense, ExpenseCreate, ExpenseRow>('/fleet/expenses', expenseFromRow, expenseToRow),
  // the real database is seeded by schema.sql, not by the app
  async seedIfEmpty() {},
  async resetSeed() {},
};
