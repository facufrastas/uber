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
  ExpenseShare,
  ExpenseType,
  Maintenance,
  MaintenanceCreate,
  Owner,
  OwnerCreate,
  Payment,
  PaymentCreate,
  Settlement,
  SettlementCreate,
  Shift,
  ShiftCreate,
} from '@/data/types';

// A car's ownership split, as the forms edit it (the junction row's id is an
// implementation detail resolved by setCarOwners).
export interface OwnerShare {
  ownerId: string;
  percentage: number;
}

// One participant's part of an expense, as the dialogs submit it (in ARS; the
// row's id is resolved by syncExpenseShares).
export interface ExpenseShareInput {
  ownerId: string;
  amount: number;
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
  expenseShares: ExpenseShare[];
  settlements: Settlement[];

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

  // shares: the FULL split of the expense (see ExpenseShare). Passing [] wipes
  // it — the payer bears the whole cost and nobody owes anything.
  addExpense: (input: ExpenseCreate, shares?: ExpenseShareInput[]) => Promise<void>;
  updateExpense: (id: string, input: Partial<ExpenseCreate>, shares?: ExpenseShareInput[]) => Promise<void>;
  removeExpense: (id: string) => Promise<void>;
  // The Saldado toggle: the only thing that moves an expense between the
  // Gastos and Gastos Saldados tables.
  setExpensePaid: (id: string, paid: boolean) => Promise<void>;

  addSettlement: (input: SettlementCreate) => Promise<void>;
  updateSettlement: (id: string, input: Partial<SettlementCreate>) => Promise<void>;
  removeSettlement: (id: string) => Promise<void>;

  addMaintenanceWithExpense: (maintenance: MaintenanceCreate, expense: Omit<ExpenseCreate, 'maintenanceId' | 'carId' | 'date'>, shares?: ExpenseShareInput[]) => Promise<void>;
  updateMaintenance: (id: string, input: Partial<MaintenanceCreate>) => Promise<void>;
  removeMaintenance: (id: string) => Promise<void>;
}

export const useDataStore = create<DataState>()((set, get) => {
  // after each mutation we re-read the touched collection from the
  // DataSource: the repository is the source of truth, the store just mirrors
  const refresh = async (...keys: ('cars' | 'drivers' | 'owners' | 'driverCars' | 'carOwners' | 'shifts' | 'payments' | 'maintenances' | 'expenses' | 'expenseShares' | 'settlements')[]) => {
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

  // Same diffing as the junctions above: the dialogs submit the whole split
  // and this turns it into creates/updates/removes.
  const syncExpenseShares = async (expenseId: string, shares: ExpenseShareInput[]) => {
    const current = get().expenseShares.filter((s) => s.expenseId === expenseId);
    const toAdd = shares.filter((s) => !current.some((row) => row.ownerId === s.ownerId));
    const toRemove = current.filter((row) => !shares.some((s) => s.ownerId === row.ownerId));
    const toUpdate = current.filter((row) => shares.some((s) => s.ownerId === row.ownerId && s.amount !== row.amount));

    await Promise.all([
      ...toAdd.map((s) => ds.expenseShares.create({ expenseId, ownerId: s.ownerId, amount: s.amount })),
      ...toRemove.map((row) => ds.expenseShares.remove(row.id)),
      ...toUpdate.map((row) => ds.expenseShares.update(row.id, { amount: shares.find((s) => s.ownerId === row.ownerId)!.amount })),
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
    expenseShares: [],
    settlements: [],

    loadAll: async () => {
      if (get().status === 'loading') return;
      set({ status: 'loading' });
      try {
        const [cars, drivers, owners, driverCars, carOwners, shifts, payments, maintenances, expenseTypes, expenses, expenseShares, settlements] = await Promise.all([
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
          ds.expenseShares.list(),
          ds.settlements.list(),
        ]);

        set({ status: 'ready', cars, drivers, owners, driverCars, carOwners, shifts, payments, maintenances, expenseTypes, expenses, expenseShares, settlements });
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
      // the API rejects owners with settlements (FK RESTRICT); their expense
      // shares cascade away and the expenses they paid keep no payer
      await ds.owners.remove(id);
      await refresh('owners', 'carOwners', 'expenses', 'expenseShares');
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

    addExpense: async (input, shares) => {
      const expense = await ds.expenses.create(input);

      if (shares) await syncExpenseShares(expense.id, shares);
      await refresh('expenses', 'expenseShares');
    },
    updateExpense: async (id, input, shares) => {
      await ds.expenses.update(id, input);
      if (shares) await syncExpenseShares(id, shares);
      await refresh('expenses', 'expenseShares');
    },
    removeExpense: async (id) => {
      // the DB cascades the shares away with the expense
      await ds.expenses.remove(id);
      await refresh('expenses', 'expenseShares');
    },
    setExpensePaid: async (id, paid) => {
      await ds.expenses.update(id, { paid });
      await refresh('expenses');
    },

    addSettlement: async (input) => {
      await ds.settlements.create(input);
      await refresh('settlements');
    },
    updateSettlement: async (id, input) => {
      await ds.settlements.update(id, input);
      await refresh('settlements');
    },
    removeSettlement: async (id) => {
      await ds.settlements.remove(id);
      await refresh('settlements');
    },

    addMaintenanceWithExpense: async (maintenance, expense, shares) => {
      const { expense: created } = await ds.maintenances.createWithExpense(maintenance, expense);

      if (shares) await syncExpenseShares(created.id, shares);
      await refresh('maintenances', 'expenses', 'expenseShares');
    },
    updateMaintenance: async (id, input) => {
      await ds.maintenances.update(id, input);
      await refresh('maintenances');
    },
    removeMaintenance: async (id) => {
      await ds.maintenances.remove(id);
      await refresh('maintenances', 'expenses', 'expenseShares');
    },
  };
});
