import { createStore } from 'zustand/vanilla'
import { persist } from 'zustand/middleware'

import type {
  Car,
  Driver,
  Expense,
  ExpenseType,
  Maintenance,
  Payment,
  Shift,
} from '@/data/types'

// This vanilla store (no React) IS the mock "database". Using Zustand +
// persist gives us localStorage serialization and versioning (migrate) for
// free. Not to be confused with the React dataStore: that one is an
// in-memory cache, this one is the persisted source the local repository
// reads and writes.

export interface DbState {
  cars: Car[]
  drivers: Driver[]
  shifts: Shift[]
  payments: Payment[]
  maintenances: Maintenance[]
  expenseTypes: ExpenseType[]
  expenses: Expense[]
}

export const emptyDb: DbState = {
  cars: [],
  drivers: [],
  shifts: [],
  payments: [],
  maintenances: [],
  expenseTypes: [],
  expenses: [],
}

// key renamed from 'flota-db' when the schema switched to English field
// names: a new key means old Spanish-shaped data is simply ignored and the
// app re-seeds on boot.
export const localDb = createStore<DbState>()(
  persist(() => ({ ...emptyDb }), {
    name: 'uber-db',
    version: 1,
  }),
)
