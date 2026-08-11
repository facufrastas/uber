import { useMemo, useState } from 'react';
import { ArrowRight, HandCoins, Pencil, Plus, Receipt } from 'lucide-react';
import { toast } from 'sonner';

import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDataStore } from '@/stores/dataStore';
import { debtBalances, debtEntries } from '@/lib/analytics';
import { formatARS, formatDate } from '@/lib/format';
import type { Settlement } from '@/data/types';
import { SettlementDialog } from '@/features/debts/SettlementDialog';

// Debts between owners: who paid what for everyone else, and who still owes
// money. Deliberately WITHOUT the global filter bar — a debt does not belong
// to a date range, it stands until it is paid.
export function DebtsPage() {
  const owners = useDataStore((s) => s.owners);
  const expenses = useDataStore((s) => s.expenses);
  const expenseShares = useDataStore((s) => s.expenseShares);
  const settlements = useDataStore((s) => s.settlements);
  const removeSettlement = useDataStore((s) => s.removeSettlement);

  const [dialog, setDialog] = useState<{
    open: boolean;
    settlement?: Settlement;
    defaults?: { fromOwnerId: string; toOwnerId: string; amount: number };
  }>({ open: false });

  const data = useMemo(() => ({ owners, expenses, expenseShares, settlements }), [owners, expenses, expenseShares, settlements]);
  const balances = useMemo(() => debtBalances(data), [data]);
  const entries = useMemo(() => debtEntries(data), [data]);

  const nameOf = (id: string) => owners.find((o) => o.id === id)?.name ?? 'Dueño eliminado';
  const settlementById = (id: string) => settlements.find((s) => s.id === id);

  return (
    <>
      <PageHeader title="Deudas" description="Quién le debe a quién por gastos que pagó otro">
        <Button onClick={() => setDialog({ open: true })}>
          <Plus /> Registrar pago
        </Button>
      </PageHeader>

      {balances.length === 0 ? (
        <EmptyState icon={HandCoins} title="No hay deudas pendientes" description="Cuando un gasto lo pague un dueño y se reparta con otros, la deuda aparece acá." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {balances.map((balance) => (
            <Card key={`${balance.debtorId}-${balance.creditorId}`}>
              <CardContent className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 truncate text-sm">
                    <span className="font-medium">{nameOf(balance.debtorId)}</span>
                    <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="font-medium">{nameOf(balance.creditorId)}</span>
                  </div>
                  <p className="text-xl font-semibold tabular-nums">{formatARS(balance.amount)}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setDialog({ open: true, defaults: { fromOwnerId: balance.debtorId, toOwnerId: balance.creditorId, amount: balance.amount } })}>
                  Saldar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Movimientos</h2>
        {entries.length === 0 ? (
          <EmptyState icon={Receipt} title="Sin movimientos" description="Repartí un gasto entre dueños para empezar." />
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Movimiento</TableHead>
                  <TableHead>Detalle</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => {
                  const settlement = entry.kind === 'settlement' ? settlementById(entry.id) : undefined;

                  return (
                    <TableRow key={`${entry.kind}-${entry.id}`}>
                      <TableCell>{formatDate(entry.date)}</TableCell>
                      <TableCell>
                        <Badge variant={entry.kind === 'settlement' ? 'default' : 'secondary'}>{entry.kind === 'settlement' ? 'Pago' : 'Gasto'}</Badge>
                      </TableCell>
                      {/* a settlement is stored as debt in the opposite
                          direction (that is what paying back does), so it
                          reads "X le pagó a Y" */}
                      <TableCell>{settlement ? `${nameOf(entry.creditorId)} le pagó a ${nameOf(entry.debtorId)}` : `${nameOf(entry.debtorId)} le debe a ${nameOf(entry.creditorId)}`}</TableCell>
                      <TableCell className="max-w-64 truncate text-muted-foreground">{entry.description ?? '—'}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatARS(entry.amount)}</TableCell>
                      <TableCell>
                        {/* only settlements live here: an expense's split is edited in Gastos */}
                        {settlement && (
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon-sm" aria-label="Editar" onClick={() => setDialog({ open: true, settlement })}>
                              <Pencil />
                            </Button>
                            <ConfirmDeleteDialog
                              title="Eliminar pago"
                              description="La deuda vuelve a quedar pendiente."
                              onConfirm={async () => {
                                await removeSettlement(settlement.id);
                                toast.success('Pago eliminado');
                              }}
                            />
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <SettlementDialog
        // remount per target so the prefilled values apply to a fresh form
        key={dialog.settlement?.id ?? `${dialog.defaults?.fromOwnerId ?? ''}-${dialog.defaults?.toOwnerId ?? ''}`}
        open={dialog.open}
        onOpenChange={(open) => setDialog((s) => ({ ...s, open }))}
        settlement={dialog.settlement}
        defaults={dialog.defaults}
      />
    </>
  );
}
