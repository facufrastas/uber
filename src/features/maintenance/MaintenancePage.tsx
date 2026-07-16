import { useMemo, useState } from 'react';
import { Pencil, Plus, Wrench } from 'lucide-react';
import { toast } from 'sonner';

import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { FilterBar } from '@/components/shared/FilterBar';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFilteredData } from '@/hooks/useFilteredData';
import { useDataStore } from '@/stores/dataStore';
import { formatARS, formatDate } from '@/lib/format';
import type { Expense, Maintenance } from '@/data/types';
import { MaintenanceDialog } from '@/features/maintenance/MaintenanceDialog';

export function MaintenancePage() {
  const { data, filters } = useFilteredData();
  const maintenances = useDataStore((s) => s.maintenances);
  const removeMaintenance = useDataStore((s) => s.removeMaintenance);
  const [dialog, setDialog] = useState<{
    open: boolean;
    maintenance?: Maintenance;
    expense?: Expense;
  }>({ open: false });

  const carById = (id: string) => data.cars.find((c) => c.id === id);
  const expenseByMaintenance = useMemo(() => new Map(data.expenses.filter((e) => e.maintenanceId).map((e) => [e.maintenanceId!, e])), [data.expenses]);

  // maintenances filter by range and car (the driver filter does not apply here)
  const visible = useMemo(
    () => maintenances.filter((m) => m.date >= filters.range.from && m.date <= filters.range.to && (!filters.carId || m.carId === filters.carId)).sort((a, b) => b.date.localeCompare(a.date)),
    [maintenances, filters]
  );

  const total = visible.reduce((sum, m) => sum + (expenseByMaintenance.get(m.id)?.amount ?? 0), 0);

  return (
    <>
      <PageHeader title="Mantenimientos" description="Historial de servicio de cada auto; el costo se refleja en Gastos">
        <Button onClick={() => setDialog({ open: true })}>
          <Plus /> Nuevo mantenimiento
        </Button>
      </PageHeader>
      <FilterBar />

      {visible.length === 0 ? (
        <EmptyState icon={Wrench} title="Sin mantenimientos en el período" description="Ajustá los filtros o registrá un mantenimiento." />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Auto</TableHead>
                <TableHead>Servicio</TableHead>
                <TableHead className="text-right">Km</TableHead>
                <TableHead className="text-right">Costo</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((maintenance) => {
                const car = carById(maintenance.carId);
                const expense = expenseByMaintenance.get(maintenance.id);

                return (
                  <TableRow key={maintenance.id}>
                    <TableCell>{formatDate(maintenance.date)}</TableCell>
                    <TableCell>
                      {car ? (
                        <Badge variant="secondary">
                          {car.model} {car.licensePlate}
                        </Badge>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{maintenance.serviceType}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{maintenance.km ? maintenance.km.toLocaleString('es-AR') : '—'}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{expense ? formatARS(expense.amount) : '—'}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" aria-label="Editar" onClick={() => setDialog({ open: true, maintenance, expense })}>
                          <Pencil />
                        </Button>
                        <ConfirmDeleteDialog
                          title="Eliminar mantenimiento"
                          description="Se eliminará el mantenimiento y su gasto vinculado. Esta acción no se puede deshacer."
                          onConfirm={async () => {
                            await removeMaintenance(maintenance.id);
                            toast.success('Mantenimiento y gasto vinculado eliminados');
                          }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="bg-muted/50 font-medium">
                <TableCell colSpan={4}>Total ({visible.length} servicios)</TableCell>
                <TableCell className="text-right tabular-nums">{formatARS(total)}</TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}

      <MaintenanceDialog open={dialog.open} onOpenChange={(open) => setDialog((s) => ({ ...s, open }))} maintenance={dialog.maintenance} expense={dialog.expense} />
    </>
  );
}
