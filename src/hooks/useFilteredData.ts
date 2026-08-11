import { useMemo } from 'react';

import { applyFilters, type DataSlice } from '@/lib/analytics';
import { useDataStore } from '@/stores/dataStore';
import { useFilters } from '@/hooks/useFilters';

// Joins the data store with the URL filters and memoizes the result.
// Pages consume this and never filter by hand.
export function useFilteredData() {
  const cars = useDataStore((s) => s.cars);
  const drivers = useDataStore((s) => s.drivers);
  const owners = useDataStore((s) => s.owners);
  const driverCars = useDataStore((s) => s.driverCars);
  const carOwners = useDataStore((s) => s.carOwners);
  const shifts = useDataStore((s) => s.shifts);
  const payments = useDataStore((s) => s.payments);
  const expenses = useDataStore((s) => s.expenses);
  const expenseTypes = useDataStore((s) => s.expenseTypes);
  const expenseShares = useDataStore((s) => s.expenseShares);
  const settlements = useDataStore((s) => s.settlements);
  const { filters } = useFilters();

  const data: DataSlice = useMemo(
    () => ({ cars, drivers, owners, driverCars, carOwners, shifts, payments, expenses, expenseTypes, expenseShares, settlements }),
    [cars, drivers, owners, driverCars, carOwners, shifts, payments, expenses, expenseTypes, expenseShares, settlements]
  );

  const filtered = useMemo(() => applyFilters(data, filters), [data, filters]);

  return { data, filtered, filters };
}
