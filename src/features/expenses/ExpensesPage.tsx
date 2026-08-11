import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Pencil, Plus, TrendingDown, Users, Wrench } from 'lucide-react';
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
import type { Expense } from '@/data/types';
import { ExpenseDialog } from '@/features/expenses/ExpenseDialog';

export function ExpensesPage() {
  const location = useLocation();
  const { data, filtered } = useFilteredData();
  const removeExpense = useDataStore((s) => s.removeExpense);
  const [dialog, setDialog] = useState<{ open: boolean; expense?: Expense }>({ open: false });

  const typeById = (id: string) => data.expenseTypes.find((t) => t.id === id);
  const carById = (id: string | null) => data.cars.find((c) => c.id === id);
  const ownerById = (id: string | null) => data.owners.find((o) => o.id === id);
  const sharesOf = (expenseId: string) => data.expenseShares.filter((s) => s.expenseId === expenseId);

  const sortedExpenses = useMemo(() => [...filtered.expenses].sort((a, b) => b.date.localeCompare(a.date)), [filtered.expenses]);

  const total = filtered.expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <>
      <PageHeader title="Gastos" description="Todos los gastos, incluidos los de mantenimiento">
        <Button onClick={() => setDialog({ open: true })}>
          <Plus /> Nuevo gasto
        </Button>
      </PageHeader>
      <FilterBar />

      {sortedExpenses.length === 0 ? (
        <EmptyState icon={TrendingDown} title="Sin gastos en el período" description="Ajustá los filtros o registrá un gasto nuevo." />
      ) : (
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
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedExpenses.map((expense) => {
                const car = carById(expense.carId);
                const isMaintenanceExpense = expense.maintenanceId !== null;
                const payer = ownerById(expense.paidByOwnerId);
                // what the OTHERS bear: the payer's own share is not a debt
                const debtShares = sharesOf(expense.id).filter((s) => s.ownerId !== expense.paidByOwnerId);

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
                        {/* maintenance expenses are edited/deleted from the Mantenimientos section */}
                        {!isMaintenanceExpense && (
                          <>
                            <Button variant="ghost" size="icon-sm" aria-label="Editar" onClick={() => setDialog({ open: true, expense })}>
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
                <TableCell colSpan={5}>Total ({sortedExpenses.length} gastos)</TableCell>
                <TableCell className="text-right tabular-nums">{formatARS(total)}</TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}

      <ExpenseDialog open={dialog.open} onOpenChange={(open) => setDialog((s) => ({ ...s, open }))} expense={dialog.expense} />
    </>
  );
}
