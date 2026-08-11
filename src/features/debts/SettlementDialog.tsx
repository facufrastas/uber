import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useDataStore } from '@/stores/dataStore';
import type { Settlement } from '@/data/types';

const schema = z
  .object({
    fromOwnerId: z.string().min(1, 'Elegí quién paga'),
    toOwnerId: z.string().min(1, 'Elegí quién cobra'),
    amount: z.number({ message: 'Ingresá un monto' }).positive('Debe ser mayor a 0'),
    date: z.string().min(1, 'Requerido'),
    notes: z.string(),
  })
  .refine((values) => values.fromOwnerId !== values.toOwnerId, { path: ['toOwnerId'], message: 'Tienen que ser dos dueños distintos' });

type FormValues = z.infer<typeof schema>;

interface SettlementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settlement?: Settlement; // present = editing
  // prefill when the dialog opens from a pending balance row
  defaults?: { fromOwnerId: string; toOwnerId: string; amount: number };
}

// A settlement cancels debt between two owners; it is not a fleet expense and
// never shows up in the KPIs.
export function SettlementDialog({ open, onOpenChange, settlement, defaults }: SettlementDialogProps) {
  const owners = useDataStore((s) => s.owners);
  const addSettlement = useDataStore((s) => s.addSettlement);
  const updateSettlement = useDataStore((s) => s.updateSettlement);

  // local date, not UTC: toISOString() shifts the day in Argentina (UTC-3)
  const today = format(new Date(), 'yyyy-MM-dd');

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: settlement
      ? {
          fromOwnerId: settlement.fromOwnerId,
          toOwnerId: settlement.toOwnerId,
          amount: settlement.amount,
          date: settlement.date,
          notes: settlement.notes ?? '',
        }
      : {
          fromOwnerId: defaults?.fromOwnerId ?? '',
          toOwnerId: defaults?.toOwnerId ?? '',
          amount: defaults?.amount ?? 0,
          date: today,
          notes: '',
        },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const input = {
      fromOwnerId: values.fromOwnerId,
      toOwnerId: values.toOwnerId,
      amount: values.amount,
      date: values.date,
      notes: values.notes || null,
    };

    if (settlement) {
      await updateSettlement(settlement.id, input);
      toast.success('Pago actualizado');
    } else {
      await addSettlement(input);
      toast.success('Pago registrado');
    }
    onOpenChange(false);
    form.reset();
  });

  const { errors } = form.formState;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{settlement ? 'Editar pago' : 'Registrar pago de deuda'}</DialogTitle>
          <DialogDescription>Plata que un dueño le devuelve a otro. No cuenta como gasto de la flota.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <FieldGroup className="gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Paga</FieldLabel>
                <Controller
                  control={form.control}
                  name="fromOwnerId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Elegir…" />
                      </SelectTrigger>
                      <SelectContent>
                        {owners.map((o) => (
                          <SelectItem key={o.id} value={o.id}>
                            {o.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.fromOwnerId && <FieldError>{errors.fromOwnerId.message}</FieldError>}
              </Field>
              <Field>
                <FieldLabel>Cobra</FieldLabel>
                <Controller
                  control={form.control}
                  name="toOwnerId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Elegir…" />
                      </SelectTrigger>
                      <SelectContent>
                        {owners.map((o) => (
                          <SelectItem key={o.id} value={o.id}>
                            {o.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.toOwnerId && <FieldError>{errors.toOwnerId.message}</FieldError>}
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="settlement-amount">Monto (ARS)</FieldLabel>
                <Input id="settlement-amount" type="number" step="100" {...form.register('amount', { valueAsNumber: true })} />
                {errors.amount && <FieldError>{errors.amount.message}</FieldError>}
              </Field>
              <Field>
                <FieldLabel htmlFor="settlement-date">Fecha</FieldLabel>
                <Input id="settlement-date" type="date" {...form.register('date')} />
                {errors.date && <FieldError>{errors.date.message}</FieldError>}
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="settlement-notes">Notas</FieldLabel>
              <Textarea id="settlement-notes" rows={2} {...form.register('notes')} />
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {settlement ? 'Guardar' : 'Registrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
