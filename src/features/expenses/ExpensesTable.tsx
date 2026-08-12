import { CircleCheck, Pencil, Undo2, Users, Wrench } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDataStore } from '@/stores/dataStore';
import { formatARS, formatDate } from '@/lib/format';
import type { Expense } from '@/data/types';

interface ExpensesTableProps {
  expenses: Expense[]; // already filtered and sorted by the page
  onEdit: (expense: Expense) => void;
}

// The one expenses table, shared by Gastos and Gastos Saldados: the sections
// differ only in which side of `payed` they list and in what the toggle does.
export function ExpensesTable({ expenses, onEdit }: ExpensesTableProps) {
  const location = useLocation();
  const cars = useDataStore((s) => s.cars);
  const owners = useDataStore((s) => s.owners);
  const expenseTypes = useDataStore((s) => s.expenseTypes);
  const expenseShares = useDataStore((s) => s.expenseShares);
  const removeExpense = useDataStore((s) => s.removeExpense);
  const setExpensePayed = useDataStore((s) => s.setExpensePayed);

  const typeById = (id: string) => expenseTypes.find((t) => t.id === id);
  const carById = (id: string | null) => cars.find((c) => c.id === id);
  const ownerById = (id: string | null) => owners.find((o) => o.id === id);
  const sharesOf = (expenseId: string) => expenseShares.filter((s) => s.expenseId === expenseId);

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  const togglePayed = async (expense: Expense) => {
    await setExpensePayed(expense.id, !expense.payed);
    toast.success(expense.payed ? 'Gasto devuelto a Gastos' : 'Gasto saldado');
  };

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Auto</TableHead>
            <TableHead>Pagó</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead className="text-right">Monto</TableHead>
            <TableHead className="w-28" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((expense) => {
            const car = carById(expense.carId);
            const isMaintenanceExpense = expense.maintenanceId !== null;
            const payer = ownerById(expense.paidByOwnerId);
            // what the OTHERS bear: the payer's own share is not a debt,
            // and a share of 0 is a participant who owes nothing
            const debtShares = sharesOf(expense.id).filter((s) => s.ownerId !== expense.paidByOwnerId && s.amount > 0);

            return (
              <TableRow key={expense.id}>
                <TableCell>{formatDate(expense.date)}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{typeById(expense.expenseTypeId)?.name ?? '—'}</Badge>
                </TableCell>
                <TableCell>{car ? `${car.model} ${car.licensePlate}` : <span className="text-muted-foreground">General</span>}</TableCell>
                <TableCell>
                  {payer ? (
                    <div className="flex items-center gap-1.5">
                      <span>{payer.name}</span>
                      {debtShares.length > 0 && (
                        // the hover text spells out who owes what; the badge keeps the row short
                        <Badge variant="outline" className="gap-1" title={debtShares.map((s) => `${ownerById(s.ownerId)?.name ?? 'Dueño eliminado'} debe ${formatARS(s.amount)}`).join('\n')}>
                          <Users />
                          {formatARS(debtShares.reduce((sum, s) => sum + s.amount, 0))}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="max-w-64 truncate text-muted-foreground">
                  {expense.description ?? '—'}
                  {isMaintenanceExpense && (
                    <Badge variant="outline" className="ml-2">
                      <Wrench />
                      <Link to={{ pathname: '/maintenance', search: location.search }}>Mantenimiento</Link>
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">{formatARS(expense.amount)}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    {/* available on maintenance expenses too: settling is not editing */}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={expense.payed ? 'Marcar como no saldado' : 'Marcar como saldado'}
                      title={expense.payed ? 'Marcar como no saldado' : 'Marcar como saldado'}
                      onClick={() => void togglePayed(expense)}
                    >
                      {expense.payed ? <Undo2 /> : <CircleCheck />}
                    </Button>
                    {/* maintenance expenses are edited/deleted from the Mantenimientos section */}
                    {!isMaintenanceExpense && (
                      <>
                        <Button variant="ghost" size="icon-sm" aria-label="Editar" onClick={() => onEdit(expense)}>
                          <Pencil />
                        </Button>
                        <ConfirmDeleteDialog
                          title="Eliminar gasto"
                          description="Esta acción no se puede deshacer."
                          onConfirm={async () => {
                            await removeExpense(expense.id);
                            toast.success('Gasto eliminado');
                          }}
                        />
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          <TableRow className="bg-muted/50 font-medium">
            <TableCell colSpan={5}>Total ({expenses.length} gastos)</TableCell>
            <TableCell className="text-right tabular-nums">{formatARS(total)}</TableCell>
            <TableCell />
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
