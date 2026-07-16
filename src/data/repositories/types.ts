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
  Shift,
  ShiftCreate,
} from '@/data/types'

// Generic data-access contract. The same interface is implemented by
// apiDataSource (FresaStuff-API, the default) and localDataSource
// (localStorage mock) — screens and stores never know which one is behind.
export interface Repository<T, TCreate, TUpdate = Partial<TCreate>> {
  list(): Promise<T[]>
  create(input: TCreate): Promise<T>
  update(id: string, input: TUpdate): Promise<T>
  remove(id: string): Promise<void>
}

// Composite methods: they encode business rules at the repository level —
// in the API each one maps to ONE endpoint doing both inserts.
export interface ShiftRepository extends Repository<Shift, ShiftCreate> {
  // payment is 1:1 with shift — they are created together
  createWithPayment(
    shift: ShiftCreate,
    payment: Omit<PaymentCreate, 'shiftId'>,
  ): Promise<{ shift: Shift; payment: Payment }>
}

export interface MaintenanceRepository
  extends Repository<Maintenance, MaintenanceCreate> {
  // a maintenance automatically generates its linked expense
  createWithExpense(
    maintenance: MaintenanceCreate,
    expense: Omit<ExpenseCreate, 'maintenanceId' | 'carId' | 'date'>,
  ): Promise<{ maintenance: Maintenance; expense: Expense }>
}

export interface DataSource {
  cars: Repository<Car, CarCreate>
  drivers: Repository<Driver, DriverCreate>
  shifts: ShiftRepository
  payments: Repository<Payment, PaymentCreate>
  maintenances: MaintenanceRepository
  expenseTypes: Pick<Repository<ExpenseType, never>, 'list'>
  expenses: Repository<Expense, ExpenseCreate>
  seedIfEmpty(): Promise<void>
  resetSeed(): Promise<void>
}
