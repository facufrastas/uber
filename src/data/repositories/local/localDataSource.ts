import { buildSeed } from '@/data/seed';
import { emptyDb, localDb, type DbState } from '@/data/repositories/local/localDb';
import type { DataSource, MaintenanceRepository, Repository, ShiftRepository } from '@/data/repositories/types';
import type { Expense, Maintenance, Payment, Shift } from '@/data/types';

// Local implementation of the DataSource against the persisted store
// (localDb). Important rules mirrored from schema.sql:
//   * deleting a shift deletes its payment (ON DELETE CASCADE)
//   * deleting a maintenance deletes its linked expense (ON DELETE CASCADE)

type Row = { id: string; createdAt: string };

function makeRepository<T extends Row>(
  read: (db: DbState) => T[],
  write: (rows: T[]) => Partial<DbState>,
  onRemove?: (id: string, db: DbState) => Partial<DbState>
): Repository<T, Omit<T, 'id' | 'createdAt'>> {
  return {
    async list() {
      return read(localDb.getState());
    },
    async create(input) {
      const row = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() } as T;

      localDb.setState((db) => write([...read(db), row]));

      return row;
    },
    async update(id, input) {
      let updated: T | undefined;

      localDb.setState((db) =>
        write(
          read(db).map((row) => {
            if (row.id !== id) return row;
            updated = { ...row, ...input };

            return updated;
          })
        )
      );
      if (!updated) throw new Error(`No row found with id ${id}`);

      return updated;
    },
    async remove(id) {
      localDb.setState((db) => ({
        ...write(read(db).filter((row) => row.id !== id)),
        ...onRemove?.(id, db),
      }));
    },
  };
}

const shiftsBase = makeRepository<Shift>(
  (db) => db.shifts,
  (shifts) => ({ shifts }),
  (id, db) => ({
    // cascade: the shift's payment goes with it
    payments: db.payments.filter((p) => p.shiftId !== id),
  })
);

const shifts: ShiftRepository = {
  ...shiftsBase,
  async createWithPayment(shiftInput, paymentInput) {
    const shift = await shiftsBase.create(shiftInput);
    const payment: Payment = {
      ...paymentInput,
      shiftId: shift.id,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    localDb.setState((db) => ({ payments: [...db.payments, payment] }));

    return { shift, payment };
  },
};

const maintenancesBase = makeRepository<Maintenance>(
  (db) => db.maintenances,
  (maintenances) => ({ maintenances }),
  (id, db) => ({
    // cascade: the linked expense goes with the maintenance
    expenses: db.expenses.filter((e) => e.maintenanceId !== id),
  })
);

const maintenances: MaintenanceRepository = {
  ...maintenancesBase,
  async createWithExpense(maintenanceInput, expenseInput) {
    const maintenance = await maintenancesBase.create(maintenanceInput);
    const expense: Expense = {
      ...expenseInput,
      carId: maintenance.carId,
      date: maintenance.date,
      maintenanceId: maintenance.id,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    localDb.setState((db) => ({ expenses: [...db.expenses, expense] }));

    return { maintenance, expense };
  },
};

export const localDataSource: DataSource = {
  cars: makeRepository(
    (db) => db.cars,
    (cars) => ({ cars })
  ),
  drivers: makeRepository(
    (db) => db.drivers,
    (drivers) => ({ drivers })
  ),
  shifts,
  payments: makeRepository(
    (db) => db.payments,
    (payments) => ({ payments })
  ),
  maintenances,
  expenseTypes: {
    async list() {
      return localDb.getState().expenseTypes;
    },
  },
  expenses: makeRepository(
    (db) => db.expenses,
    (expenses) => ({ expenses })
  ),
  async seedIfEmpty() {
    if (localDb.getState().cars.length === 0) {
      localDb.setState(buildSeed());
    }
  },
  async resetSeed() {
    localDb.setState({ ...emptyDb });
    localDb.setState(buildSeed());
  },
};
