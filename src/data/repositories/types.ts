import type {
  Car,
  CarCreate,
  CarOwner,
  CarOwnerCreate,
  Driver,
  DriverCar,
  DriverCarCreate,
  DriverCreate,
  Expense,
  ExpenseCreate,
  ExpenseType,
  Maintenance,
  MaintenanceCreate,
  Owner,
  OwnerCreate,
  Payment,
  PaymentCreate,
  Shift,
  ShiftCreate,
} from '@/data/types';

// Generic data-access contract. The same interface is implemented by
// apiDataSource (FresaStuff-API, the default) and localDataSource
// (localStorage mock) — screens and stores never know which one is behind.
export interface Repository<T, TCreate, TUpdate = Partial<TCreate>> {
  list(): Promise<T[]>;
  create(input: TCreate): Promise<T>;
  update(id: string, input: TUpdate): Promise<T>;
  remove(id: string): Promise<void>;
}

// Composite methods: they encode business rules at the repository level —
// in the API each one maps to ONE endpoint doing both inserts.
export interface ShiftRepository extends Repository<Shift, ShiftCreate> {
  // payment is 1:1 with shift — they are created together
  createWithPayment(shift: ShiftCreate, payment: Omit<PaymentCreate, 'shiftId'>): Promise<{ shift: Shift; payment: Payment }>;
}

export interface MaintenanceRepository extends Repository<Maintenance, MaintenanceCreate> {
  // a maintenance automatically generates its linked expense
  createWithExpense(maintenance: MaintenanceCreate, expense: Omit<ExpenseCreate, 'maintenanceId' | 'carId' | 'date'>): Promise<{ maintenance: Maintenance; expense: Expense }>;
}

export interface DataSource {
  cars: Repository<Car, CarCreate>;
  drivers: Repository<Driver, DriverCreate>;
  owners: Repository<Owner, OwnerCreate>;
  shifts: ShiftRepository;
  payments: Repository<Payment, PaymentCreate>;
  maintenances: MaintenanceRepository;
  expenseTypes: Pick<Repository<ExpenseType, never>, 'list'>;
  expenses: Repository<Expense, ExpenseCreate>;
  // Junctions are plain CRUD: replacing an assignment set is a diff of
  // creates/removes done once in the data store, so it works the same against
  // both data sources without bespoke endpoints.
  driverCars: Repository<DriverCar, DriverCarCreate>;
  carOwners: Repository<CarOwner, CarOwnerCreate>;
  seedIfEmpty(): Promise<void>;
  resetSeed(): Promise<void>;
}
