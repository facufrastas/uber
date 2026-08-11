import { Plus, Split, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDataStore } from '@/stores/dataStore';
import { formatARS } from '@/lib/format';
import { evenRows, NO_PAYER, splitToShares, type SplitValue } from '@/features/expenses/expenseSplit';

interface ExpenseSplitFieldsProps {
  value: SplitValue;
  onChange: (value: SplitValue) => void;
  amount: number; // the expense's total, to preview each part in ARS
  error?: string;
}

// Payer + split editor, shared by ExpenseDialog and MaintenanceDialog (a
// maintenance is an expense too). No participants = the payer bears the whole
// cost; with participants, whoever is not the payer ends up owing their part.
export function ExpenseSplitFields({ value, onChange, amount, error }: ExpenseSplitFieldsProps) {
  const owners = useDataStore((s) => s.owners);

  const { paidByOwnerId, rows } = value;
  const shares = splitToShares(value, Number.isNaN(amount) ? 0 : amount);
  const amountOf = (ownerId: string) => shares.find((s) => s.ownerId === ownerId)?.amount ?? 0;
  const setRows = (next: typeof rows) => onChange({ ...value, rows: next });

  // The common case is "I paid, the other one owes me half": the first click
  // lays out that 50/50 with the payer already in place.
  const addRow = () =>
    setRows(
      rows.length === 0 && paidByOwnerId !== NO_PAYER
        ? [
            { ownerId: paidByOwnerId, percentage: 50 },
            { ownerId: '', percentage: 50 },
          ]
        : [...rows, { ownerId: '', percentage: NaN }]
    );

  return (
    <>
      <Field>
        <FieldLabel>Pagado por</FieldLabel>
        <Select value={paidByOwnerId} onValueChange={(v) => onChange({ ...value, paidByOwnerId: v })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_PAYER}>Sin especificar</SelectItem>
            {owners.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field>
        <FieldLabel>Reparto entre dueños</FieldLabel>
        <div className="space-y-2">
          {rows.map((row, index) => (
            <div key={index} className="flex items-center gap-2">
              <Select value={row.ownerId} onValueChange={(v) => setRows(rows.map((r, i) => (i === index ? { ...r, ownerId: v } : r)))}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Elegí un dueño" />
                </SelectTrigger>
                <SelectContent>
                  {owners
                    .filter((o) => o.id === row.ownerId || !rows.some((r) => r.ownerId === o.id))
                    .map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <div className="relative w-24">
                <Input
                  type="number"
                  step="0.01"
                  className="pr-6"
                  aria-label="Porcentaje"
                  value={Number.isNaN(row.percentage) ? '' : row.percentage}
                  onChange={(e) => setRows(rows.map((r, i) => (i === index ? { ...r, percentage: e.target.valueAsNumber } : r)))}
                />
                <span className="absolute top-1/2 right-2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
              </div>
              <span className="w-24 shrink-0 text-right text-sm tabular-nums text-muted-foreground">{formatARS(amountOf(row.ownerId))}</span>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Quitar participante" onClick={() => setRows(rows.filter((_, i) => i !== index))}>
                <X />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={rows.length >= owners.length} onClick={addRow}>
              <Plus /> Agregar participante
            </Button>
            {rows.length > 1 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setRows(evenRows(rows))}>
                <Split /> Partes iguales
              </Button>
            )}
          </div>
        </div>
        {error ? <FieldError>{error}</FieldError> : rows.length === 0 && <p className="text-xs text-muted-foreground">Sin participantes el gasto queda entero a cargo de quien lo pagó.</p>}
      </Field>
    </>
  );
}
