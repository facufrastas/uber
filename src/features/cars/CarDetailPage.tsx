import { useMemo, useState } from 'react';
import { ArrowLeft, Car as CarIcon, Pencil, TriangleAlert } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { EmptyState } from '@/components/shared/EmptyState';
import { FilterBar } from '@/components/shared/FilterBar';
import { KpiCard } from '@/components/shared/KpiCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFilteredData } from '@/hooks/useFilteredData';
import { applyFilters, computeKpis, computeKpisPrevious, incomeVsExpensesByDay, ownershipPercentage } from '@/lib/analytics';
import { formatARS } from '@/lib/format';
import { CarDialog } from '@/features/cars/CarDialog';
import { PayoffCard } from '@/features/cars/PayoffCard';
import { IncomeVsExpensesChart } from '@/features/home/charts';

// proportional delta vs. previous period; null when there is no baseline
const delta = (current: number, previous: number) => (previous === 0 ? null : (current - previous) / Math.abs(previous));

export function CarDetailPage() {
  const { id = '' } = useParams();
  const { data, filters } = useFilteredData();
  const [editOpen, setEditOpen] = useState(false);

  const car = data.cars.find((c) => c.id === id);

  // the page is pinned to this car but keeps the global date range, so the
  // URL stays shareable and the preset follows the user in from the dashboard
  const carFilters = useMemo(() => ({ ...filters, carId: id, driverId: null, ownerId: null }), [filters, id]);
  const filtered = useMemo(() => applyFilters(data, carFilters), [data, carFilters]);
  const kpis = useMemo(() => computeKpis(filtered), [filtered]);
  const previousKpis = useMemo(() => computeKpisPrevious(data, carFilters), [data, carFilters]);
  const dailySeries = useMemo(() => incomeVsExpensesByDay(data, filtered, filters.range), [data, filtered, filters.range]);

  const drivers = data.driverCars.filter((dc) => dc.carId === id).flatMap((dc) => data.drivers.filter((d) => d.id === dc.driverId));
  const owners = data.carOwners.filter((co) => co.carId === id).flatMap((co) => data.owners.filter((o) => o.id === co.ownerId).map((owner) => ({ owner, percentage: co.percentage })));
  const ownedPct = ownershipPercentage(data, id);

  if (!car) {
    return (
      <>
        <PageHeader title="Auto" description="No encontrado" />
        <EmptyState icon={CarIcon} title="Auto inexistente" description="El auto que buscás no existe o fue eliminado." />
        <div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/cars">
              <ArrowLeft /> Volver a Autos
            </Link>
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" asChild>
          <Link to="/cars">
            <ArrowLeft /> Autos
          </Link>
        </Button>
      </div>

      <PageHeader title={`${car.brand} ${car.model}`} description={`${car.licensePlate}${car.year ? ` · ${car.year}` : ''} · ${car.currentKm.toLocaleString('es-AR')} km`}>
        <div className="flex items-center gap-2">
          <Badge variant={car.active ? 'secondary' : 'outline'}>{car.active ? 'Activo' : 'Inactivo'}</Badge>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil /> Editar
          </Button>
        </div>
      </PageHeader>

      <FilterBar entityFilters={false} />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard label="Ingresos" value={formatARS(kpis.totalIncome)} delta={delta(kpis.totalIncome, previousKpis.totalIncome)} />
        <KpiCard label="Gastos" value={formatARS(kpis.totalExpenses)} delta={delta(kpis.totalExpenses, previousKpis.totalExpenses)} invertedDelta />
        <KpiCard label="Neto" value={formatARS(kpis.net)} delta={delta(kpis.net, previousKpis.net)} />
        <KpiCard label="Turnos" value={`${kpis.shiftCount}`} delta={delta(kpis.shiftCount, previousKpis.shiftCount)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <PayoffCard data={data} carId={id} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Choferes asignados</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1">
            {drivers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin choferes asignados.</p>
            ) : (
              drivers.map((driver) => (
                <Badge key={driver.id} variant="secondary">
                  {driver.name}
                </Badge>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dueños</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {owners.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin dueños registrados.</p>
            ) : (
              <>
                <dl className="space-y-1 text-sm">
                  {owners.map(({ owner, percentage }) => (
                    <div key={owner.id} className="flex justify-between gap-2">
                      <dt>{owner.name}</dt>
                      <dd className="tabular-nums text-muted-foreground">{percentage}%</dd>
                    </div>
                  ))}
                </dl>
                {Math.abs(ownedPct - 100) > 0.01 && (
                  <Badge variant="outline" className="text-amber-600 dark:text-amber-500">
                    <TriangleAlert />
                    Los porcentajes suman {ownedPct}%
                  </Badge>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <IncomeVsExpensesChart series={dailySeries} />

      <CarDialog open={editOpen} onOpenChange={setEditOpen} car={car} />
    </>
  );
}
