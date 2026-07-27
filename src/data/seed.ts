import type { DbState } from '@/data/repositories/local/localDb';
import type { Car, CarOwner, Driver, DriverCar, Expense, ExpenseType, Maintenance, Owner, Payment, Shift } from '@/data/types';

// DETERMINISTIC mock-data generator: same seed → same data. Charts look
// identical after every "Restablecer datos de prueba" and any visual bug is
// reproducible.

// mulberry32 PRNG — good enough for mock data, seedable unlike Math.random()
function mulberry32(seed: number) {
  let a = seed;

  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);

    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(20260714);

const uuid = () => crypto.randomUUID();
const pick = <T>(arr: T[]) => arr[Math.floor(rng() * arr.length)];
const between = (min: number, max: number) => min + rng() * (max - min);
// LOCAL formatting (not toISOString, which shifts the day depending on the timezone)
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const SEED_START = new Date(2026, 4, 15); // may 15, 2026
const SEED_END = new Date(2026, 6, 14); // jul 14, 2026

// values stay in Spanish: they are displayed to the user
export const EXPENSE_TYPE_NAMES = ['Combustible', 'Mantenimiento', 'Seguro', 'Patente', 'Lavado', 'Multas', 'Peajes', 'Otros'] as const;

export function buildSeed(): DbState {
  const now = new Date().toISOString();

  const expenseTypes: ExpenseType[] = EXPENSE_TYPE_NAMES.map((name) => ({
    id: uuid(),
    name,
    createdAt: now,
  }));
  const typeId = (name: (typeof EXPENSE_TYPE_NAMES)[number]) => expenseTypes.find((t) => t.name === name)!.id;

  // purchase data (USD) is older than the shift window so the payoff bars
  // show partial progress instead of starting from zero
  const cars: Car[] = [
    { brand: 'Toyota', model: 'Corolla', licensePlate: 'AF123BC', year: 2022, currentKm: 87500, purchaseCost: 16800, purchaseDate: '2025-08-01' },
    { brand: 'Chevrolet', model: 'Cruze', licensePlate: 'AD456GH', year: 2021, currentKm: 112300, purchaseCost: 14500, purchaseDate: '2025-11-10' },
    { brand: 'Fiat', model: 'Cronos', licensePlate: 'AG789JK', year: 2023, currentKm: 54200, purchaseCost: 12000, purchaseDate: '2026-02-01' },
  ].map((c) => ({ ...c, id: uuid(), active: true, createdAt: now }));

  const drivers: Driver[] = [
    { name: 'Marcos Giménez', phone: '351 555-0101', dni: '32456789' },
    { name: 'Lucas Herrera', phone: '351 555-0102', dni: '33567890' },
    { name: 'Diego Sosa', phone: '351 555-0103', dni: '35678901' },
    { name: 'Julián Paredes', phone: '351 555-0104', dni: '36789012' },
    { name: 'Ramiro Aguirre', phone: '351 555-0105', dni: '37890123' },
  ].map((d) => ({ ...d, id: uuid(), active: true, createdAt: now }));

  // 2 + 2 + 1: the Cronos keeps a single driver so the "missing second
  // driver" warning is visible in the UI. Ramiro also drives the Cruze, so
  // the many-to-many case is present in the mock data.
  const driverCars: DriverCar[] = [
    { driverId: drivers[0].id, carId: cars[0].id },
    { driverId: drivers[1].id, carId: cars[0].id },
    { driverId: drivers[2].id, carId: cars[1].id },
    { driverId: drivers[3].id, carId: cars[1].id },
    { driverId: drivers[4].id, carId: cars[2].id },
    { driverId: drivers[4].id, carId: cars[1].id },
  ].map((dc) => ({ ...dc, id: uuid(), createdAt: now }));

  const owners: Owner[] = [
    { name: 'Facundo Frastas', phone: '351 555-0201', notes: null },
    { name: 'Martín Aguilar', phone: '351 555-0202', notes: null },
  ].map((o) => ({ ...o, id: uuid(), active: true, createdAt: now }));

  // one car per owner plus one split 60/40, to exercise the weighted totals
  const carOwners: CarOwner[] = [
    { carId: cars[0].id, ownerId: owners[0].id, percentage: 100 },
    { carId: cars[1].id, ownerId: owners[0].id, percentage: 60 },
    { carId: cars[1].id, ownerId: owners[1].id, percentage: 40 },
    { carId: cars[2].id, ownerId: owners[1].id, percentage: 100 },
  ].map((co) => ({ ...co, id: uuid(), createdAt: now }));

  // shifts are generated from the car's own drivers, so a driver assigned to
  // two cars only works one of them per slot
  const driversOfCar = (carId: string) => driverCars.filter((dc) => dc.carId === carId).map((dc) => drivers.find((d) => d.id === dc.driverId)!);

  const shifts: Shift[] = [];
  const payments: Payment[] = [];
  const expenses: Expense[] = [];
  const maintenances: Maintenance[] = [];

  for (let d = new Date(SEED_START); d <= SEED_END; d.setDate(d.getDate() + 1)) {
    const date = iso(d);
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;

    for (const car of cars) {
      // ~10% of days with no activity per car
      if (rng() < 0.1) continue;

      const carDrivers = driversOfCar(car.id);
      // morning shift and afternoon/evening shift
      const timeSlots = [
        { start: '06:00', end: '14:00' },
        { start: '14:00', end: '22:00' },
      ];

      timeSlots.forEach((slot, i) => {
        // cars with a single driver do one shift per day
        if (i >= carDrivers.length && rng() < 0.7) return;
        // the day rotates the roster, so a car with three drivers gives all
        // of them shifts instead of always the first two
        const driver = carDrivers[(i + d.getDate()) % carDrivers.length];

        const shift: Shift = {
          id: uuid(),
          driverId: driver.id,
          carId: car.id,
          date,
          startTime: slot.start,
          endTime: slot.end,
          notes: null,
          createdAt: now,
        };

        shifts.push(shift);

        const base = between(45000, 95000);
        const amount = Math.round((isWeekend ? base * 1.25 : base) / 500) * 500;

        payments.push({
          id: uuid(),
          shiftId: shift.id,
          amount,
          paymentMethod: 'transferencia',
          notes: null,
          createdAt: now,
        });
      });

      // fuel roughly every other day
      if (rng() < 0.5) {
        expenses.push({
          id: uuid(),
          expenseTypeId: typeId('Combustible'),
          carId: car.id,
          maintenanceId: null,
          amount: Math.round(between(15000, 30000) / 100) * 100,
          date,
          description: 'Carga de combustible',
          createdAt: now,
        });
      }

      // car wash ~weekly
      if (rng() < 0.12) {
        expenses.push({
          id: uuid(),
          expenseTypeId: typeId('Lavado'),
          carId: car.id,
          maintenanceId: null,
          amount: Math.round(between(6000, 10000) / 500) * 500,
          date,
          description: 'Lavado completo',
          createdAt: now,
        });
      }
    }

    // monthly insurance per car, on the 1st
    if (d.getDate() === 1) {
      for (const car of cars) {
        expenses.push({
          id: uuid(),
          expenseTypeId: typeId('Seguro'),
          carId: car.id,
          maintenanceId: null,
          amount: 80000,
          date,
          description: `Seguro mensual ${car.licensePlate}`,
          createdAt: now,
        });
      }
    }
  }

  // a couple of fines
  for (const description of ['Multa por estacionamiento', 'Multa por velocidad']) {
    expenses.push({
      id: uuid(),
      expenseTypeId: typeId('Multas'),
      carId: pick(cars).id,
      maintenanceId: null,
      amount: Math.round(between(40000, 90000) / 1000) * 1000,
      date: iso(new Date(2026, 5, Math.ceil(between(1, 28)))),
      description,
      createdAt: now,
    });
  }

  // maintenances, each with its linked expense (type Mantenimiento)
  const services = [
    { serviceType: 'Cambio de aceite y filtro', cost: [70000, 110000] as const },
    { serviceType: 'Cambio de cubiertas (x2)', cost: [280000, 380000] as const },
    { serviceType: 'Pastillas de freno', cost: [90000, 140000] as const },
    { serviceType: 'Cambio de aceite y filtro', cost: [70000, 110000] as const },
    { serviceType: 'Alineación y balanceo', cost: [35000, 55000] as const },
  ];

  services.forEach((s, i) => {
    const car = cars[i % cars.length];
    const date = iso(new Date(2026, 4 + (i % 2), Math.ceil(between(2, 27))));
    const maintenance: Maintenance = {
      id: uuid(),
      carId: car.id,
      serviceType: s.serviceType,
      km: car.currentKm - Math.round(between(1000, 15000)),
      date,
      notes: null,
      createdAt: now,
    };

    maintenances.push(maintenance);
    expenses.push({
      id: uuid(),
      expenseTypeId: typeId('Mantenimiento'),
      carId: car.id,
      maintenanceId: maintenance.id,
      amount: Math.round(between(s.cost[0], s.cost[1]) / 1000) * 1000,
      date,
      description: s.serviceType,
      createdAt: now,
    });
  });

  return { cars, drivers, owners, driverCars, carOwners, shifts, payments, maintenances, expenseTypes, expenses };
}
