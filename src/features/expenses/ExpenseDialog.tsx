import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useDataStore } from '@/stores/dataStore';
import type { Expense } from '@/data/types';
import { ExpenseSplitFields } from '@/features/expenses/ExpenseSplitFields';
import { emptySplit, NO_PAYER, sharesToSplit, splitSchema, splitToShares } from '@/features/expenses/expenseSplit';

const NO_CAR = '__no_car__';

const schema = z.object({
  expenseTypeId: z.string().min(1, 'Elegí un tipo'),
  carId: z.string(),
  amount: z.number({ message: 'Ingresá un monto' }).positive('Debe ser mayor a 0'),
  date: z.string().min(1, 'Requerido'),
  description: z.string(),
  split: splitSchema,
});

type FormValues = z.infer<typeof schema>;

interface ExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense;
}

export function ExpenseDialog({ open, onOpenChange, expense }: ExpenseDialogProps) {
  const cars = useDataStore((s) => s.cars);
  const expenseTypes = useDataStore((s) => s.expenseTypes);
  const expenseShares = useDataStore((s) => s.expenseShares);
  const addExpense = useDataStore((s) => s.addExpense);
  const updateExpense = useDataStore((s) => s.updateExpense);

  // local date, not UTC: toISOString() shifts the day in Argentina (UTC-3)
  const today = format(new Date(), 'yyyy-MM-dd');

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: expense
      ? {
          expenseTypeId: expense.expenseTypeId,
          carId: expense.carId ?? NO_CAR,
          amount: expense.amount,
          date: expense.date,
          description: expense.description ?? '',
          split: sharesToSplit(
            expense.paidByOwnerId,
            expenseShares.filter((s) => s.expenseId === expense.id),
            expense.amount
          ),
        }
      : { expenseTypeId: '', carId: NO_CAR, amount: 0, date: today, description: '', split: emptySplit },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const input = {
      expenseTypeId: values.expenseTypeId,
      carId: values.carId === NO_CAR ? null : values.carId,
      maintenanceId: expense?.maintenanceId ?? null,
      paidByOwnerId: values.split.paidByOwnerId === NO_PAYER ? null : values.split.paidByOwnerId,
      amount: values.amount,
      date: values.date,
      description: values.description || null,
    };
    // the shares are rewritten from the percentages on every save, so editing
    // the amount keeps the split consistent
    const shares = splitToShares(values.split, values.amount);

    if (expense) {
      await updateExpense(expense.id, input, shares);
      toast.success('Gasto actualizado');
    } else {
      await addExpense(input, shares);
      toast.success('Gasto registrado');
    }
    onOpenChange(false);
    form.reset();
  });

  const { errors } = form.formState;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{expense ? 'Editar gasto' : 'Nuevo gasto'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <FieldGroup className="gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Tipo</FieldLabel>
                <Controller
                  control={form.control}
                  name="expenseTypeId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Elegir…" />
                      </SelectTrigger>
                      <SelectContent>
                        {expenseTypes.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.expenseTypeId && <FieldError>{errors.expenseTypeId.message}</FieldError>}
              </Field>
              <Field>
                <FieldLabel>Auto</FieldLabel>
                <Controller
                  control={form.control}
                  name="carId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_CAR}>Gasto general</SelectItem>
                        {cars.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.model} {c.licensePlate}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="expense-amount">Monto (ARS)</FieldLabel>
                <Input id="expense-amount" type="number" step="100" {...form.register('amount', { valueAsNumber: true })} />
                {errors.amount && <FieldError>{errors.amount.message}</FieldError>}
              </Field>
              <Field>
                <FieldLabel htmlFor="expense-date">Fecha</FieldLabel>
                <Input id="expense-date" type="date" {...form.register('date')} />
                {errors.date && <FieldError>{errors.date.message}</FieldError>}
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="expense-description">Descripción</FieldLabel>
              <Textarea id="expense-description" rows={2} {...form.register('description')} />
            </Field>
            <Controller
              control={form.control}
              name="split"
              render={({ field }) => <ExpenseSplitFields value={field.value} onChange={field.onChange} amount={form.watch('amount')} error={errors.split?.message} />}
            />
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {expense ? 'Guardar' : 'Registrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
