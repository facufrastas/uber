import { create } from 'zustand'

import { getDataSource } from '@/data/repositories'
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

// Data store for React. NOT persisted on purpose: it is only an in-memory
// cache of the DataSource + async actions — the source of truth lives behind
// the repository (FresaStuff-API, or localStorage in local mode).

const ds = getDataSource()

interface DataState {
  status: 'idle' | 'loading' | 'ready' | 'error'
  cars: Car[]
  drivers: Driver[]
  shifts: Shift[]
  payments: Payment[]
  maintenances: Maintenance[]
  expenseTypes: ExpenseType[]
  expenses: Expense[]

  loadAll: () => Promise<void>
  resetSeed: () => Promise<void>

  addCar: (input: CarCreate) => Promise<void>
  updateCar: (id: string, input: Partial<CarCreate>) => Promise<void>
  removeCar: (id: string) => Promise<void>

  addDriver: (input: DriverCreate) => Promise<void>
  updateDriver: (id: string, input: Partial<DriverCreate>) => Promise<void>
  removeDriver: (id: string) => Promise<void>

  addShiftWithPayment: (
    shift: ShiftCreate,
    payment: Omit<PaymentCreate, 'shiftId'>,
  ) => Promise<void>
  updateShift: (id: string, input: Partial<ShiftCreate>) => Promise<void>
  updatePayment: (id: string, input: Partial<PaymentCreate>) => Promise<void>
  removeShift: (id: string) => Promise<void>

  addExpense: (input: ExpenseCreate) => Promise<void>
  updateExpense: (id: string, input: Partial<ExpenseCreate>) => Promise<void>
  removeExpense: (id: string) => Promise<void>

  addMaintenanceWithExpense: (
    maintenance: MaintenanceCreate,
    expense: Omit<ExpenseCreate, 'maintenanceId' | 'carId' | 'date'>,
  ) => Promise<void>
  updateMaintenance: (id: string, input: Partial<MaintenanceCreate>) => Promise<void>
  removeMaintenance: (id: string) => Promise<void>
}

export const useDataStore = create<DataState>()((set, get) => {
  // after each mutation we re-read the touched collection from the
  // DataSource: the repository is the source of truth, the store just mirrors
  const refresh = async (
    ...keys: ('cars' | 'drivers' | 'shifts' | 'payments' | 'maintenances' | 'expenses')[]
  ) => {
    const patch: Record<string, unknown> = {}
    for (const key of keys) patch[key] = await ds[key].list()
    set(patch as Partial<DataState>)
  }

  return {
    status: 'idle',
    cars: [],
    drivers: [],
    shifts: [],
    payments: [],
    maintenances: [],
    expenseTypes: [],
    expenses: [],

    loadAll: async () => {
      if (get().status === 'loading') return
      set({ status: 'loading' })
      try {
        await ds.seedIfEmpty()
        const [cars, drivers, shifts, payments, maintenances, expenseTypes, expenses] =
          await Promise.all([
            ds.cars.list(),
            ds.drivers.list(),
            ds.shifts.list(),
            ds.payments.list(),
            ds.maintenances.list(),
            ds.expenseTypes.list(),
            ds.expenses.list(),
          ])
        set({ status: 'ready', cars, drivers, shifts, payments, maintenances, expenseTypes, expenses })
      } catch (err) {
        // an expired session already redirects via RequireAuth; this covers
        // the backend being unreachable
        console.error(err)
        set({ status: 'error' })
      }
    },

    resetSeed: async () => {
      await ds.resetSeed()
      set({ status: 'idle' })
      await get().loadAll()
    },

    addCar: async (input) => {
      await ds.cars.create(input)
      await refresh('cars')
    },
    updateCar: async (id, input) => {
      await ds.cars.update(id, input)
      await refresh('cars')
    },
    removeCar: async (id) => {
      await ds.cars.remove(id)
      await refresh('cars')
    },

    addDriver: async (input) => {
      await ds.drivers.create(input)
      await refresh('drivers')
    },
    updateDriver: async (id, input) => {
      await ds.drivers.update(id, input)
      await refresh('drivers')
    },
    removeDriver: async (id) => {
      await ds.drivers.remove(id)
      await refresh('drivers')
    },

    addShiftWithPayment: async (shift, payment) => {
      await ds.shifts.createWithPayment(shift, payment)
      await refresh('shifts', 'payments')
    },
    updateShift: async (id, input) => {
      await ds.shifts.update(id, input)
      await refresh('shifts')
    },
    updatePayment: async (id, input) => {
      await ds.payments.update(id, input)
      await refresh('payments')
    },
    removeShift: async (id) => {
      await ds.shifts.remove(id)
      await refresh('shifts', 'payments')
    },

    addExpense: async (input) => {
      await ds.expenses.create(input)
      await refresh('expenses')
    },
    updateExpense: async (id, input) => {
      await ds.expenses.update(id, input)
      await refresh('expenses')
    },
    removeExpense: async (id) => {
      await ds.expenses.remove(id)
      await refresh('expenses')
    },

    addMaintenanceWithExpense: async (maintenance, expense) => {
      await ds.maintenances.createWithExpense(maintenance, expense)
      await refresh('maintenances', 'expenses')
    },
    updateMaintenance: async (id, input) => {
      await ds.maintenances.update(id, input)
      await refresh('maintenances')
    },
    removeMaintenance: async (id) => {
      await ds.maintenances.remove(id)
      await refresh('maintenances', 'expenses')
    },
  }
})
