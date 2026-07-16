import { useMemo, useState } from 'react';
import { Pencil, Plus, TrendingUp } from 'lucide-react';
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
import type { Payment, Shift } from '@/data/types';
import { ShiftDialog } from '@/features/income/ShiftDialog';

export function IncomePage() {
  const { data, filtered } = useFilteredData();
  const removeShift = useDataStore((s) => s.removeShift);
  const [dialog, setDialog] = useState<{ open: boolean; shift?: Shift; payment?: Payment }>({
    open: false,
  });

  const paymentByShift = useMemo(() => new Map(data.payments.map((p) => [p.shiftId, p])), [data.payments]);
  const driverById = (id: string) => data.drivers.find((d) => d.id === id);
  const carById = (id: string) => data.cars.find((c) => c.id === id);

  const sortedShifts = useMemo(() => [...filtered.shifts].sort((a, b) => b.date.localeCompare(a.date)), [filtered.shifts]);

  const total = filtered.payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <>
      <PageHeader title="Ingresos" description="Turnos y pagos de los choferes">
        <Button onClick={() => setDialog({ open: true })}>
          <Plus /> Nuevo turno
        </Button>
      </PageHeader>
      <FilterBar />

      {sortedShifts.length === 0 ? (
        <EmptyState icon={TrendingUp} title="Sin turnos en el período" description="Ajustá los filtros o registrá un turno nuevo." />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Chofer</TableHead>
                <TableHead>Auto</TableHead>
                <TableHead>Horario</TableHead>
                <TableHead>Método</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedShifts.map((shift) => {
                const payment = paymentByShift.get(shift.id);
                const car = carById(shift.carId);

                return (
                  <TableRow key={shift.id}>
                    <TableCell>{formatDate(shift.date)}</TableCell>
                    <TableCell className="font-medium">{driverById(shift.driverId)?.name ?? '—'}</TableCell>
                    <TableCell>
                      {car ? (
                        <Badge variant="secondary">
                          {car.model} {car.licensePlate}
                        </Badge>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{shift.startTime && shift.endTime ? `${shift.startTime} – ${shift.endTime}` : '—'}</TableCell>
                    <TableCell className="capitalize text-muted-foreground">{payment?.paymentMethod ?? '—'}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{payment ? formatARS(payment.amount) : '—'}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" aria-label="Editar" onClick={() => setDialog({ open: true, shift, payment })}>
                          <Pencil />
                        </Button>
                        <ConfirmDeleteDialog
                          title="Eliminar turno"
                          description="Se eliminará el turno y su pago asociado. Esta acción no se puede deshacer."
                          onConfirm={async () => {
                            await removeShift(shift.id);
                            toast.success('Turno eliminado');
                          }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="bg-muted/50 font-medium">
                <TableCell colSpan={5}>Total ({sortedShifts.length} turnos)</TableCell>
                <TableCell className="text-right tabular-nums">{formatARS(total)}</TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}

      <ShiftDialog open={dialog.open} onOpenChange={(open) => setDialog((s) => ({ ...s, open }))} shift={dialog.shift} payment={dialog.payment} />
    </>
  );
}
