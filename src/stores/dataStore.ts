import { create } from 'zustand';

import { getDataSource } from '@/data/repositories';
import type {
  Car,
  CarCreate,
  CarOwner,
  Driver,
  DriverCar,
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

// A car's ownership split, as the forms edit it (the junction row's id is an
// implementation detail resolved by setCarOwners).
export interface OwnerShare {
  ownerId: string;
  percentage: number;
}

// Data store for React. NOT persisted on purpose: it is only an in-memory
// cache of the DataSource + async actions — the source of truth lives behind
// the repository (FresaStuff-API, or localStorage in local mode).

const ds = getDataSource();

interface DataState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  cars: Car[];
  drivers: Driver[];
  owners: Owner[];
  driverCars: DriverCar[];
  carOwners: CarOwner[];
  shifts: Shift[];
  payments: Payment[];
  maintenances: Maintenance[];
  expenseTypes: ExpenseType[];
  expenses: Expense[];

  loadAll: () => Promise<void>;

  addCar: (input: CarCreate, owners?: OwnerShare[]) => Promise<void>;
  updateCar: (id: string, input: Partial<CarCreate>, owners?: OwnerShare[]) => Promise<void>;
  removeCar: (id: string) => Promise<void>;

  addDriver: (input: DriverCreate, carIds?: string[]) => Promise<void>;
  updateDriver: (id: string, input: Partial<DriverCreate>, carIds?: string[]) => Promise<void>;
  removeDriver: (id: string) => Promise<void>;

  addOwner: (input: OwnerCreate) => Promise<void>;
  updateOwner: (id: string, input: Partial<OwnerCreate>) => Promise<void>;
  removeOwner: (id: string) => Promise<void>;

  // Assignment sets: both replace the current rows with the given ones by
  // diffing (create what's missing, remove what's gone, update changed
  // percentages). Same code path for both data sources.
  setDriverCars: (driverId: string, carIds: string[]) => Promise<void>;
  setCarOwners: (carId: string, owners: OwnerShare[]) => Promise<void>;

  addShiftWithPayment: (shift: ShiftCreate, payment: Omit<PaymentCreate, 'shiftId'>) => Promise<void>;
  updateShift: (id: string, input: Partial<ShiftCreate>) => Promise<void>;
  updatePayment: (id: string, input: Partial<PaymentCreate>) => Promise<void>;
  removeShift: (id: string) => Promise<void>;

  addExpense: (input: ExpenseCreate) => Promise<void>;
  updateExpense: (id: string, input: Partial<ExpenseCreate>) => Promise<void>;
  removeExpense: (id: string) => Promise<void>;

  addMaintenanceWithExpense: (maintenance: MaintenanceCreate, expense: Omit<ExpenseCreate, 'maintenanceId' | 'carId' | 'date'>) => Promise<void>;
  updateMaintenance: (id: string, input: Partial<MaintenanceCreate>) => Promise<void>;
  removeMaintenance: (id: string) => Promise<void>;
}

export const useDataStore = create<DataState>()((set, get) => {
  // after each mutation we re-read the touched collection from the
  // DataSource: the repository is the source of truth, the store just mirrors
  const refresh = async (...keys: ('cars' | 'drivers' | 'owners' | 'driverCars' | 'carOwners' | 'shifts' | 'payments' | 'maintenances' | 'expenses')[]) => {
    const patch: Record<string, unknown> = {};

    for (const key of keys) patch[key] = await ds[key].list();
    set(patch as Partial<DataState>);
  };

  // Junction sync, without refreshing: the caller refreshes once at the end.
  // There are no transactions (same as the composite creates), so the writes
  // just run in parallel and a failure surfaces to the dialog.
  const syncDriverCars = async (driverId: string, carIds: string[]) => {
    const current = get().driverCars.filter((dc) => dc.driverId === driverId);
    const toAdd = carIds.filter((carId) => !current.some((dc) => dc.carId === carId));
    const toRemove = current.filter((dc) => !carIds.includes(dc.carId));

    await Promise.all([...toAdd.map((carId) => ds.driverCars.create({ driverId, carId })), ...toRemove.map((dc) => ds.driverCars.remove(dc.id))]);
  };

  const syncCarOwners = async (carId: string, owners: OwnerShare[]) => {
    const current = get().carOwners.filter((co) => co.carId === carId);
    const toAdd = owners.filter((o) => !current.some((co) => co.ownerId === o.ownerId));
    const toRemove = current.filter((co) => !owners.some((o) => o.ownerId === co.ownerId));
    const toUpdate = current.filter((co) => owners.some((o) => o.ownerId === co.ownerId && o.percentage !== co.percentage));

    await Promise.all([
      ...toAdd.map((o) => ds.carOwners.create({ carId, ownerId: o.ownerId, percentage: o.percentage })),
      ...toRemove.map((co) => ds.carOwners.remove(co.id)),
      ...toUpdate.map((co) => ds.carOwners.update(co.id, { percentage: owners.find((o) => o.ownerId === co.ownerId)!.percentage })),
    ]);
  };

  return {
    status: 'idle',
    cars: [],
    drivers: [],
    owners: [],
    driverCars: [],
    carOwners: [],
    shifts: [],
    payments: [],
    maintenances: [],
    expenseTypes: [],
    expenses: [],

    loadAll: async () => {
      if (get().status === 'loading') return;
      set({ status: 'loading' });
      try {
        const [cars, drivers, owners, driverCars, carOwners, shifts, payments, maintenances, expenseTypes, expenses] = await Promise.all([
          ds.cars.list(),
          ds.drivers.list(),
          ds.owners.list(),
          ds.driverCars.list(),
          ds.carOwners.list(),
          ds.shifts.list(),
          ds.payments.list(),
          ds.maintenances.list(),
          ds.expenseTypes.list(),
          ds.expenses.list(),
        ]);

        set({ status: 'ready', cars, drivers, owners, driverCars, carOwners, shifts, payments, maintenances, expenseTypes, expenses });
      } catch (err) {
        // an expired session already redirects via RequireAuth; this covers
        // the backend being unreachable
        console.error(err);
        set({ status: 'error' });
      }
    },

    addCar: async (input, owners) => {
      const car = await ds.cars.create(input);

      if (owners) await syncCarOwners(car.id, owners);
      await refresh('cars', 'carOwners');
    },
    updateCar: async (id, input, owners) => {
      await ds.cars.update(id, input);
      if (owners) await syncCarOwners(id, owners);
      await refresh('cars', 'carOwners');
    },
    removeCar: async (id) => {
      await ds.cars.remove(id);
      await refresh('cars', 'driverCars', 'carOwners');
    },

    addDriver: async (input, carIds) => {
      const driver = await ds.drivers.create(input);

      if (carIds) await syncDriverCars(driver.id, carIds);
      await refresh('drivers', 'driverCars');
    },
    updateDriver: async (id, input, carIds) => {
      await ds.drivers.update(id, input);
      if (carIds) await syncDriverCars(id, carIds);
      await refresh('drivers', 'driverCars');
    },
    removeDriver: async (id) => {
      await ds.drivers.remove(id);
      await refresh('drivers', 'driverCars');
    },

    addOwner: async (input) => {
      await ds.owners.create(input);
      await refresh('owners');
    },
    updateOwner: async (id, input) => {
      await ds.owners.update(id, input);
      await refresh('owners');
    },
    removeOwner: async (id) => {
      await ds.owners.remove(id);
      await refresh('owners', 'carOwners');
    },

    setDriverCars: async (driverId, carIds) => {
      await syncDriverCars(driverId, carIds);
      await refresh('driverCars');
    },
    setCarOwners: async (carId, owners) => {
      await syncCarOwners(carId, owners);
      await refresh('carOwners');
    },

    addShiftWithPayment: async (shift, payment) => {
      await ds.shifts.createWithPayment(shift, payment);
      await refresh('shifts', 'payments');
    },
    updateShift: async (id, input) => {
      await ds.shifts.update(id, input);
      await refresh('shifts');
    },
    updatePayment: async (id, input) => {
      await ds.payments.update(id, input);
      await refresh('payments');
    },
    removeShift: async (id) => {
      await ds.shifts.remove(id);
      await refresh('shifts', 'payments');
    },

    addExpense: async (input) => {
      await ds.expenses.create(input);
      await refresh('expenses');
    },
    updateExpense: async (id, input) => {
      await ds.expenses.update(id, input);
      await refresh('expenses');
    },
    removeExpense: async (id) => {
      await ds.expenses.remove(id);
      await refresh('expenses');
    },

    addMaintenanceWithExpense: async (maintenance, expense) => {
      await ds.maintenances.createWithExpense(maintenance, expense);
      await refresh('maintenances', 'expenses');
    },
    updateMaintenance: async (id, input) => {
      await ds.maintenances.update(id, input);
      await refresh('maintenances');
    },
    removeMaintenance: async (id) => {
      await ds.maintenances.remove(id);
      await refresh('maintenances', 'expenses');
    },
  };
});
